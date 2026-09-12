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
from pathlib import Path
from typing import Any, Mapping


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "config" / "mihomo-script-customizations.json"
USER_AGENT = "mihomo-script-builder/1.0 (+https://github.com/frostmage1250/mihomo-script)"
BEGIN_BASE = "// BEGIN GENERATED: BASE_RULE_PROVIDERS"
END_BASE = "// END GENERATED: BASE_RULE_PROVIDERS"
BEGIN_SERVICES = "// BEGIN GENERATED: RETAINED_SERVICES"
END_SERVICES = "// END GENERATED: RETAINED_SERVICES"


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


def resolve_upstream(manifest: Mapping[str, Any]) -> tuple[str, str, str]:
    upstream = manifest["upstream"]
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
    unexpected = sorted(set(actual) - set(expected))
    if missing or changed or unexpected:
        details = []
        if missing:
            details.append("missing: " + ", ".join(missing))
        if changed:
            details.append("changed: " + ", ".join(changed))
        if unexpected:
            details.append("unexpected: " + ", ".join(unexpected))
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


def select_upstream_definitions(
    extracted: Mapping[str, Any], manifest: Mapping[str, Any]
) -> tuple[dict[str, Any], dict[str, Any]]:
    services_by_name: dict[str, Any] = {}
    for service in extracted["services"]:
        name = service.get("name")
        if name in services_by_name:
            raise BuildError(f"Duplicate upstream service definition: {name}")
        services_by_name[name] = service

    selected_services: dict[str, Any] = {}
    all_upstream_provider_names: set[str] = set()
    for service in extracted["services"]:
        all_upstream_provider_names.update(service.get("providers", {}))

    for name, expected_providers in manifest["retained_services"].items():
        if name not in services_by_name:
            raise BuildError(f"Required upstream service disappeared or was renamed: {name}")
        service = services_by_name[name]
        providers = service.get("providers", {})
        if set(providers) != set(expected_providers):
            raise BuildError(
                f"Provider set changed for {name}: expected {sorted(expected_providers)}, got {sorted(providers)}"
            )
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

    collisions = sorted(set(manifest["reserved_extra_provider_names"]) & all_upstream_provider_names)
    if collisions:
        raise BuildError("Upstream now collides with reserved Bett providers: " + ", ".join(collisions))

    upstream_base = extracted["baseRuleProviders"]
    selected_base: dict[str, Any] = {}
    for name in manifest["retained_base_rule_providers"]:
        provider = upstream_base.get(name)
        if provider is None:
            raise BuildError(f"Required upstream base provider disappeared: {name}")
        _validate_provider(name, provider)
        selected_base[name] = provider
    return selected_base, selected_services


def render_const(name: str, value: Mapping[str, Any]) -> str:
    return f"const {name} = " + json.dumps(value, ensure_ascii=False, indent=2) + ";"


def replace_marked(text: str, begin: str, end: str, body: str) -> str:
    if text.count(begin) != 1 or text.count(end) != 1:
        raise BuildError(f"Generated script markers are missing or duplicated: {begin}")
    start = text.index(begin) + len(begin)
    finish = text.index(end, start)
    return text[:start] + "\n" + body.rstrip() + "\n" + text[finish:]


def render_script(
    current: str, sha: str, base: Mapping[str, Any], services: Mapping[str, Any]
) -> str:
    updated, count = re.subn(
        r"(?m)^ \* 上游提交：[0-9a-f]{40}$",
        f" * 上游提交：{sha}",
        current,
    )
    if count != 1:
        raise BuildError("Generated script must contain exactly one upstream commit header")
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


def build(manifest: Mapping[str, Any], current_script: str, upstream: str, sha: str) -> tuple[str, str]:
    extracted = _extract_with_node(upstream)
    validate_contracts(extracted, manifest)
    base, services = select_upstream_definitions(extracted, manifest)
    script = render_script(current_script, sha, base, services)
    report = {
        "schema_version": 1,
        "upstream": {
            "repository": manifest["upstream"]["repository"],
            "path": manifest["upstream"]["path"],
            "commit": sha,
        },
        "output_sha256": hashlib.sha256(script.encode("utf-8")).hexdigest(),
        "retained_base_rule_providers": list(base),
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
        output_path = ROOT / manifest["output"]
        report_path = ROOT / manifest["report"]
        current = output_path.read_text(encoding="utf-8")
        script, report = build(manifest, current, upstream, sha)
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

