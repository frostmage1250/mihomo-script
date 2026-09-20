#!/usr/bin/env python3
"""Build the reviewed Mihomo override from a pinned upstream revision."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Mapping


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "config" / "mihomo-script-customizations.json"
USER_AGENT = "mihomo-script-builder/1.0 (+https://github.com/frostmage1250/mihomo-script)"
BEGIN_BASE = "// BEGIN GENERATED: BASE_RULE_PROVIDERS"
END_BASE = "// END GENERATED: BASE_RULE_PROVIDERS"
BEGIN_SERVICES = "// BEGIN GENERATED: RETAINED_SERVICES"
END_SERVICES = "// END GENERATED: RETAINED_SERVICES"
BEGIN_DNS = "// ---dns和hosts相关处理---"
END_DNS = "// --- 单订阅输出层 ---"
UPSTREAM_END_DNS = "// --- 主入口 ---"
EXCLUDED_REAL_IP_DOMAINS = frozenset({"*-update.xoyocdn.com", "*-appboot.netflix.com"})


class BuildError(RuntimeError):
    """Raised when upstream cannot be transformed without review."""


def fetch_json(url: str) -> Any:
    headers = {"Accept": "application/vnd.github+json", "User-Agent": USER_AGENT}
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise BuildError(f"Failed to fetch JSON from {url}: {exc}") from exc


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            if getattr(response, "status", 200) != 200:
                raise BuildError(f"HTTP {response.status} while downloading {url}")
            return response.read().decode("utf-8-sig")
    except (urllib.error.URLError, TimeoutError, UnicodeDecodeError) as exc:
        raise BuildError(f"Failed to download {url}: {exc}") from exc


def resolve_upstream(manifest: Mapping[str, Any], key: str = "upstream") -> tuple[str, str, str]:
    upstream = manifest[key]
    owner, repo = upstream["repository"].split("/", 1)
    path = upstream["path"]
    branch = upstream.get("branch", "main")
    api = (
        f"https://api.github.com/repos/{owner}/{repo}/commits"
        f"?sha={branch}&path={path}&per_page=1"
    )
    commits = fetch_json(api)
    if not isinstance(commits, list) or not commits or not commits[0].get("sha"):
        raise BuildError("GitHub returned no upstream commit for the configured path")
    sha = commits[0]["sha"]
    raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{sha}/{path}"
    return sha, raw_url, fetch_text(raw_url)


def extract_real_ip_domains(source: str) -> list[str]:
    """Read only Repcz's top-level real_ip_domains sequence; fail on format drift."""
    lines = source.splitlines()
    headers = [i for i, line in enumerate(lines) if re.fullmatch(r"real_ip_domains:\s*(?:#.*)?", line)]
    if len(headers) != 1:
        raise BuildError("Expected exactly one top-level real_ip_domains list in Repcz Egern YAML")

    domains: list[str] = []
    seen: set[str] = set()
    for line in lines[headers[0] + 1:]:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if re.match(r"^[A-Za-z_][A-Za-z0-9_-]*:", line):
            break
        match = re.fullmatch(r"\s*-\s+(.+?)\s*", line)
        if not match:
            raise BuildError(f"Unsupported real_ip_domains item: {line}")
        value = re.split(r"\s+#", match.group(1), maxsplit=1)[0].strip()
        if value.startswith("'") and value.endswith("'"):
            domain = value[1:-1].replace("''", "'")
        elif value.startswith('"') and value.endswith('"'):
            try:
                domain = json.loads(value)
            except json.JSONDecodeError as exc:
                raise BuildError(f"Invalid quoted real_ip_domains item: {value}") from exc
        else:
            domain = value
        domain = domain.lower()
        labels = domain.split(".")
        if len(labels) < 2 or any(not re.fullmatch(r"[a-z0-9*-]+", label) for label in labels):
            raise BuildError(f"Invalid real_ip_domains pattern: {domain}")
        if domain not in seen:
            domains.append(domain)
            seen.add(domain)
        if len(domains) > 1000:
            raise BuildError("Repcz real_ip_domains list is unexpectedly large")
    if not domains:
        raise BuildError("Repcz real_ip_domains list is empty")
    return domains


def select_real_ip_domains(source_domains: list[str]) -> tuple[list[str], list[str]]:
    """Keep Mihomo-compatible patterns and omit the two optional exceptions."""
    domains = [domain for domain in source_domains if domain not in EXCLUDED_REAL_IP_DOMAINS]
    excluded = [domain for domain in source_domains if domain in EXCLUDED_REAL_IP_DOMAINS]
    unsupported = [
        domain for domain in domains
        if any("*" in label and label != "*" for label in domain.split("."))
    ]
    if unsupported:
        raise BuildError("Unsupported real_ip_domains wildcard placement: " + ", ".join(unsupported))
    if not domains:
        raise BuildError("No Mihomo-compatible real_ip_domains remain after exclusions")
    return domains, excluded


def _extract_with_node(source: str) -> dict[str, Any]:
    export_code = r'''
const __contractFunctions = {
  filterAndNormalizeProxies,
  hostSpecificity,
  matchDomainPattern,
  applyHostsToProxies,
  stripDnsSuffix,
  isIpAddress,
  simplifyDomainPolicy,
  buildDnsAndHostsConfig,
  main,
};
const __payload = {
  baseRuleProviders,
  services: serviceConfigs.map(({ name, providers, rules }) => ({ name, providers: providers || {}, rules: rules || [] })),
  contracts: {
    excludeFilter: String(excludeFilter),
    commonDnsList,
    directProxies,
    regionDefinitions: regionDefinitions.map(({ name, regex }) => ({ name, regex: String(regex) })),
    rateRegionDefinitions: rateRegionDefinitions.map(({ name, regex }) => ({ name, regex: String(regex) })),
    functions: Object.fromEntries(Object.entries(__contractFunctions).map(([name, fn]) => [name, String(fn)])),
  },
};
process.stdout.write(JSON.stringify(__payload));
'''
    with tempfile.TemporaryDirectory() as temp_dir:
        runner = Path(temp_dir) / "upstream-export.js"
        runner.write_text(source + "\n" + export_code, encoding="utf-8", newline="\n")
        try:
            completed = subprocess.run(
                [os.environ.get("NODE_BIN", "node"), str(runner)],
                check=True,
                capture_output=True,
                text=True,
                encoding="utf-8",
                timeout=60,
            )
        except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
            stderr = getattr(exc, "stderr", "")
            raise BuildError(f"Unable to evaluate upstream JavaScript with Node: {stderr or exc}") from exc
    try:
        return json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise BuildError("Upstream JavaScript exporter returned invalid JSON") from exc


def canonical_hash(value: Any) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def contract_hashes(contracts: Mapping[str, Any]) -> dict[str, str]:
    result = {
        "excludeFilter": canonical_hash(contracts["excludeFilter"]),
        "commonDnsList": canonical_hash(contracts["commonDnsList"]),
        "directProxies": canonical_hash(contracts["directProxies"]),
    }
    selected_regions = {item["name"]: item for item in contracts["regionDefinitions"]}
    selected_rates = {item["name"]: item for item in contracts["rateRegionDefinitions"]}
    for name in ("香港", "日本", "美国", "新加坡", "台湾省"):
        if name not in selected_regions:
            raise BuildError(f"Required upstream region definition disappeared: {name}")
        result[f"region:{name}"] = canonical_hash(selected_regions[name])
    if "低倍率节点" not in selected_rates:
        raise BuildError("Required upstream low-rate definition disappeared")
    result["rate:低倍率节点"] = canonical_hash(selected_rates["低倍率节点"])
    for name, source in contracts["functions"].items():
        result[f"function:{name}"] = canonical_hash(source)
    return result


def validate_contracts(extracted: Mapping[str, Any], manifest: Mapping[str, Any]) -> None:
    actual = contract_hashes(extracted["contracts"])
    expected = manifest["upstream_contract_hashes"]
    missing = sorted(set(expected) - set(actual))
    changed = sorted(name for name in expected if actual.get(name) != expected[name])
    if missing or changed:
        details = []
        if missing:
            details.append("missing: " + ", ".join(missing))
        if changed:
            details.append("changed: " + ", ".join(changed))
        raise BuildError("Reviewed upstream contract changed; manual review required (" + "; ".join(details) + ")")


def _validate_provider(name: str, provider: Mapping[str, Any]) -> None:
    required = {"type", "format", "interval", "behavior", "url", "path"}
    missing = sorted(required - set(provider))
    if missing:
        raise BuildError(f"Provider {name} lost required fields: {', '.join(missing)}")
    if provider["type"] != "http" or provider["format"] != "mrs":
        raise BuildError(f"Provider {name} changed type/format")
    expected_behavior = "ipcidr" if name.endswith("_ip") or name in {"cn_ip", "private_ip"} else "domain"
    if provider["behavior"] != expected_behavior:
        raise BuildError(f"Provider {name} changed behavior to {provider['behavior']!r}")


def detect_service_renames(previous_order: list[str], current_order: list[str]) -> dict[str, str]:
    """Pair renamed services inside sequence replacement blocks while ignoring pure additions."""
    renames: dict[str, str] = {}
    matcher = SequenceMatcher(a=previous_order, b=current_order, autojunk=False)
    for tag, old_start, old_end, new_start, new_end in matcher.get_opcodes():
        if tag != "replace":
            continue
        removed = previous_order[old_start:old_end]
        added = current_order[new_start:new_end]
        for old_name, new_name in zip(removed, added):
            renames[old_name] = new_name
    return renames


def _resolve_service_name(
    configured_name: str,
    services_by_name: Mapping[str, Any],
    aliases: Mapping[str, Any],
    detected_renames: Mapping[str, str],
) -> tuple[str | None, list[str]]:
    queue = [configured_name]
    visited: list[str] = []
    seen: set[str] = set()
    while queue:
        candidate = queue.pop(0)
        if candidate in seen:
            continue
        seen.add(candidate)
        visited.append(candidate)
        if candidate in services_by_name:
            return candidate, visited
        configured_aliases = aliases.get(candidate, [])
        if isinstance(configured_aliases, str):
            configured_aliases = [configured_aliases]
        queue.extend(str(alias) for alias in configured_aliases)
        detected = detected_renames.get(candidate)
        if detected:
            queue.append(detected)
    return None, visited


def select_upstream_definitions(
    extracted: Mapping[str, Any],
    manifest: Mapping[str, Any],
    previous_service_order: list[str] | None = None,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, str], list[str]]:
    services_by_name: dict[str, Any] = {}
    current_service_order: list[str] = []
    for service in extracted["services"]:
        name = service.get("name")
        if name in services_by_name:
            raise BuildError(f"Duplicate upstream service definition: {name}")
        services_by_name[name] = service
        current_service_order.append(name)

    detected_renames = detect_service_renames(previous_service_order or [], current_service_order)
    aliases = manifest.get("retained_service_aliases", {})
    selected_services: dict[str, Any] = {}
    reference_renames: dict[str, str] = {}
    selected_provider_names: set[str] = set()

    for configured_name in manifest["retained_services"]:
        name, visited = _resolve_service_name(configured_name, services_by_name, aliases, detected_renames)
        if name is None:
            raise BuildError(f"Required upstream service disappeared without a detectable replacement: {configured_name}")
        if name in selected_services:
            raise BuildError(f"Multiple retained services resolved to the same upstream service: {name}")
        for previous_name in visited:
            if previous_name != name:
                reference_renames[previous_name] = name
        service = services_by_name[name]
        providers = service.get("providers", {})
        for provider_name, provider in providers.items():
            _validate_provider(provider_name, provider)
        rules = service.get("rules", [])
        if not rules:
            raise BuildError(f"Upstream service {name} has no rules")
        referenced: set[str] = set()
        for rule in rules:
            parts = rule.split(",")
            if len(parts) < 3 or parts[0] != "RULE-SET":
                raise BuildError(f"Unsupported upstream rule in {name}: {rule}")
            referenced.add(parts[1])
        if referenced != set(providers):
            raise BuildError(
                f"Rule/provider mismatch for {name}: rules use {sorted(referenced)}, providers are {sorted(providers)}"
            )
        selected_services[name] = {"providers": providers, "rules": rules}
        selected_provider_names.update(providers)

    collisions = sorted(set(manifest["reserved_extra_provider_names"]) & selected_provider_names)
    if collisions:
        raise BuildError("Selected upstream services collide with reserved Bett providers: " + ", ".join(collisions))

    upstream_base = extracted["baseRuleProviders"]
    selected_base: dict[str, Any] = {}
    for name in manifest["retained_base_rule_providers"]:
        provider = upstream_base.get(name)
        if provider is None:
            raise BuildError(f"Required upstream base provider disappeared: {name}")
        _validate_provider(name, provider)
        selected_base[name] = provider
    return selected_base, selected_services, reference_renames, current_service_order


def render_const(name: str, value: Mapping[str, Any]) -> str:
    return f"const {name} = " + json.dumps(value, ensure_ascii=False, indent=2) + ";"


def replace_marked(text: str, begin: str, end: str, body: str) -> str:
    if text.count(begin) != 1 or text.count(end) != 1:
        raise BuildError(f"Generated script markers are missing or duplicated: {begin}")
    start = text.index(begin) + len(begin)
    finish = text.index(end, start)
    return text[:start] + "\n" + body.rstrip() + "\n" + text[finish:]


def render_dns_section(upstream: str, real_ip_domains: list[str]) -> str:
    if upstream.count(BEGIN_DNS) != 1 or upstream.count(UPSTREAM_END_DNS) != 1:
        raise BuildError("Upstream DNS/hosts section markers are missing or duplicated")
    start = upstream.index(BEGIN_DNS) + len(BEGIN_DNS)
    finish = upstream.index(UPSTREAM_END_DNS, start)
    body = upstream[start:finish].strip()

    # The local single-subscription group is named Proxy.
    body = body.replace("#默认代理", "#Proxy")

    # FCM is intentionally absent from this streamlined output.
    body = re.sub(
        r"(?m)^[ \t]*\.\.\.\(ruleOptionsEnable\['FCM'\] \? \['rule-set:googlefcm'\] : \[\]\),\r?\n?",
        "",
        body,
    )

    # These upstream hosts are permanently excluded from the generated output.
    forbidden_hosts = (
        "services.googleapis.cn",
        "+.mcdn.bilivideo.com",
        "+.mcdn.bilivideo.cn",
        "+.edge.mountaintoys.cn",
        "+.h2.smtcdns.net",
    )
    for host in forbidden_hosts:
        body = re.sub(
            rf"""(?m)^[ \t]*(['"]){re.escape(host)}\1:\s*[^\n]+,\r?\n?""",
            "",
            body,
        )
    body = re.sub(
        r"(?m)^[ \t]*// (?:解决谷歌商店无法下载的问题|屏蔽哔哩哔哩PCDN，解决访问视频/直播卡顿问题)\r?\n?",
        "",
        body,
    )

    # Keep the existing blacklist mode and use Mihomo's native domain matching.
    body, filter_count = re.subn(
        r"(?m)^([ \t]*)'fake-ip-filter':[ \t]*\[\r?\n",
        lambda match: match.group(0) + match.group(1) + "  ...repczRealIpDomains,\n",
        body,
    )
    if filter_count != 1:
        raise BuildError("Unable to add Repcz real-IP domains to fake-ip-filter")

    # Always resolve mainland-domain rules and direct connections with system DNS.
    body, cn_count = re.subn(
        r"(?m)^(\s*)'rule-set:cn':\s*[^\n]+,$",
        r"\1'rule-set:cn': ['system'],",
        body,
    )
    body, direct_count = re.subn(
        r"(?m)^(\s*)'direct-nameserver':\s*[^\n]+,$",
        r"\1'direct-nameserver': ['system'],",
        body,
    )
    if cn_count != 1 or direct_count != 1:
        raise BuildError("Unable to enforce system DNS for mainland or direct-domain resolution")
    return "const repczRealIpDomains = " + json.dumps(real_ip_domains, ensure_ascii=False, indent=2) + ";\n\n" + body


def sync_tun_stack(current: str, upstream: str) -> str:
    upstream_tun = re.search(
        r"(?ms)newConfig\['tun'\]\s*=\s*\{(?P<body>.*?)^\s*\};",
        upstream,
    )
    if not upstream_tun:
        raise BuildError("Unable to locate upstream TUN configuration")
    stack_match = re.search(
        r"""(?m)^\s*stack:\s*(['"])(?P<value>[^'"]+)\1,\s*$""",
        upstream_tun.group("body"),
    )
    if not stack_match:
        raise BuildError("Unable to locate upstream TUN stack")
    stack = stack_match.group("value")

    updated, count = re.subn(
        r"""(?m)^(?P<indent>\s*)stack:\s*(['"])[^'"]+\2,\s*$""",
        lambda match: f"{match.group('indent')}stack: '{stack}',",
        current,
    )
    if count != 1:
        raise BuildError("Generated script must contain exactly one TUN stack")
    return updated


def render_script(
    current: str,
    upstream: str,
    sha: str,
    base: Mapping[str, Any],
    services: Mapping[str, Any],
    service_renames: Mapping[str, str],
    real_ip_domains: list[str],
) -> str:
    updated, count = re.subn(
        r"(?m)^ \* 上游提交：[0-9a-f]{40}$",
        f" * 上游提交：{sha}",
        current,
    )
    if count != 1:
        raise BuildError("Generated script must contain exactly one upstream commit header")
    for old_name, new_name in service_renames.items():
        property_pattern = rf"(?m)^(?P<indent>\s*){re.escape(old_name)}:"
        updated = re.sub(
            property_pattern,
            lambda match: f"{match.group('indent')}{json.dumps(new_name, ensure_ascii=False)}:",
            updated,
        )
        call_pattern = rf"serviceRules\((['\"]){re.escape(old_name)}\1\)"
        updated = re.sub(call_pattern, f"serviceRules({json.dumps(new_name, ensure_ascii=False)})", updated)
    updated = replace_marked(updated, BEGIN_DNS, END_DNS, render_dns_section(upstream, real_ip_domains))
    updated = sync_tun_stack(updated, upstream)
    updated = replace_marked(
        updated,
        BEGIN_BASE,
        END_BASE,
        "// 定义基础 Rule Providers\n" + render_const("baseRuleProviders", base),
    )
    updated = replace_marked(
        updated,
        BEGIN_SERVICES,
        END_SERVICES,
        "// 从锁定上游提取；仓库构建器按服务名重新生成此对象\n"
        + render_const("retainedServiceDefinitions", services),
    )
    return updated.replace("\r\n", "\n").rstrip() + "\n"


def build(
    manifest: Mapping[str, Any],
    current_script: str,
    upstream: str,
    sha: str,
    real_ip_domains: list[str],
    real_ip_domains_sha: str,
    previous_service_order: list[str] | None = None,
) -> tuple[str, str]:
    extracted = _extract_with_node(upstream)
    validate_contracts(extracted, manifest)
    base, services, service_renames, service_order = select_upstream_definitions(
        extracted, manifest, previous_service_order
    )
    applied_domains, excluded_domains = select_real_ip_domains(real_ip_domains)
    script = render_script(current_script, upstream, sha, base, services, service_renames, applied_domains)
    report = {
        "schema_version": 1,
        "upstream": {
            "repository": manifest["upstream"]["repository"],
            "path": manifest["upstream"]["path"],
            "commit": sha,
        },
        "output_sha256": hashlib.sha256(script.encode("utf-8")).hexdigest(),
        "real_ip_domains_upstream": {
            "repository": manifest["real_ip_domains_upstream"]["repository"],
            "path": manifest["real_ip_domains_upstream"]["path"],
            "commit": real_ip_domains_sha,
            "domains": real_ip_domains,
            "applied_domains": applied_domains,
            "excluded_domains": excluded_domains,
        },
        "retained_base_rule_providers": list(base),
        "upstream_service_order": service_order,
        "retained_services": {
            name: {"providers": list(value["providers"]), "rules": value["rules"]}
            for name, value in services.items()
        },
    }
    return script, json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def write_or_check(path: Path, content: str, check: bool) -> bool:
    existing = path.read_text(encoding="utf-8") if path.exists() else None
    changed = existing != content
    if changed and not check:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8", newline="\n")
    return changed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--print-contracts", action="store_true")
    parser.add_argument("--upstream-file", type=Path)
    parser.add_argument("--upstream-sha")
    args = parser.parse_args()
    try:
        manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
        if args.upstream_file:
            if not args.upstream_sha:
                raise BuildError("--upstream-sha is required with --upstream-file")
            sha = args.upstream_sha
            upstream = args.upstream_file.read_text(encoding="utf-8")
        else:
            sha, _url, upstream = resolve_upstream(manifest)
        extracted = _extract_with_node(upstream)
        if args.print_contracts:
            print(json.dumps(contract_hashes(extracted["contracts"]), ensure_ascii=False, indent=2, sort_keys=True))
            return 0
        real_ip_domains_sha, _url, real_ip_source = resolve_upstream(manifest, "real_ip_domains_upstream")
        real_ip_domains = extract_real_ip_domains(real_ip_source)
        output_path = ROOT / manifest["output"]
        report_path = ROOT / manifest["report"]
        previous_service_order: list[str] = []
        if report_path.exists():
            previous_report = json.loads(report_path.read_text(encoding="utf-8"))
            previous_service_order = previous_report.get("upstream_service_order", [])
        current = output_path.read_text(encoding="utf-8")
        script, report = build(
            manifest, current, upstream, sha, real_ip_domains, real_ip_domains_sha, previous_service_order
        )
        changed = [
            str(path.relative_to(ROOT))
            for path, content in ((output_path, script), (report_path, report))
            if write_or_check(path, content, args.check)
        ]
        if args.check and changed:
            raise BuildError("Generated files are not deterministic: " + ", ".join(changed))
        print(f"Mihomo script upstream {sha}; changed files: {len(changed)}")
        return 0
    except (BuildError, OSError, json.JSONDecodeError, KeyError) as exc:
        print(f"Mihomo script build failed: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
