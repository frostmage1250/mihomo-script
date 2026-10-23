#!/usr/bin/env python3
"""Build the custom Mihomo override from current upstream definitions."""

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
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Mapping


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "custom" / "customizations.json"
USER_AGENT = "mihomo-script-builder/1.0 (+https://github.com/frostmage1250/mihomo-script)"
BEGIN_BASE = "// BEGIN GENERATED: BASE_RULE_PROVIDERS"
END_BASE = "// END GENERATED: BASE_RULE_PROVIDERS"
BEGIN_SERVICES = "// BEGIN GENERATED: RETAINED_SERVICES"
END_SERVICES = "// END GENERATED: RETAINED_SERVICES"
BEGIN_DNS = "// ---dns和hosts相关处理---"
END_DNS = "// --- 单订阅输出层 ---"
UPSTREAM_END_DNS = "// --- 主入口 ---"
EXCLUDED_REAL_IP_DOMAINS = frozenset({"*-update.xoyocdn.com", "*-appboot.netflix.com"})



SYNC_REGION_NAMES = frozenset({"香港", "日本", "美国", "新加坡"})
JS_REGEX_LITERAL = r"/(?:\\.|[^/\\\r\n])+/[a-z]*"

class BuildError(RuntimeError):
    """Raised for invalid dependencies or unsupported source structures."""


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


def resolve_fork_upstream(manifest: Mapping[str, Any]) -> tuple[str, str, str]:
    """Read the complete upstream script restored by the native Git merge workflow."""
    source_path = manifest["upstream"]["path"]
    upstream_ref = os.environ.get("UPSTREAM_REF", "refs/remotes/upstream/main")
    try:
        def git(*args: str) -> str:
            return subprocess.check_output(
                ["git", *args], cwd=ROOT, text=True, encoding="utf-8",
            ).strip()
        head = git("rev-parse", "--verify", upstream_ref)
        sha = git("log", "-1", "--format=%H", upstream_ref, "--", source_path)
        expected = git("show", f"{upstream_ref}:{source_path}")
    except (OSError, subprocess.CalledProcessError) as exc:
        raise BuildError(f"Fork upstream Git history is unavailable: {exc}") from exc
    source = (ROOT / source_path).read_text(encoding="utf-8")
    if source.strip() != expected:
        raise BuildError("Fork source must match the merged upstream script")
    if not re.fullmatch(r"[0-9a-f]{40}", head) or not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise BuildError("Fork upstream revision must resolve to immutable commits")
    return sha, head, source


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


def _extract_with_node(source: str, current: str = "") -> dict[str, Any]:
    """Evaluate each source once and export its current definitions."""
    export_code = r'''
const __sample = (name) => ({
  name, type: 'ss', server: 'node.example.com', port: 443,
  cipher: 'aes-128-gcm', password: 'builder-fixture',
});
const __generated = main({ proxies: [__sample('日本 builder'), __sample('builder-other')], dns: {}, hosts: {} });
const __current = __CURRENT__;
const __custom = __current ? new Function(__current + '\nreturn { services: additionalServiceDefinitions, providers: additionalRuleProviders };')() : {services: {}, providers: {}};
const __serviceRules = new Set(serviceConfigs.flatMap((service) => service.rules || []));
const __prefix = new Set(prefixRules);
const __quic = new Set(typeof blockForeignQuic === 'undefined' ? [] : blockForeignQuic);
const __payload = {
  groupTestUrl: groupBaseOption.url,
  baseRuleProviders,
  prefixRules,
  fallbackRules: __generated.rules.filter((rule) => !__prefix.has(rule) && !__serviceRules.has(rule) && !__quic.has(rule)),
  icons: Object.fromEntries([
    ...serviceConfigs, ...regionDefinitions, ...rateRegionDefinitions,
    ...__generated['proxy-groups'],
  ].filter((group) => group && group.icon !== undefined).map(({name, icon}) => [name, icon])),
  services: serviceConfigs.map(({name, providers, rules}) => ({name, providers: providers || {}, rules: rules || []})),
  customServices: __custom.services,
  customProviders: __custom.providers,
  contracts: {
    excludeFilter: String(excludeFilter),
    invisibleCharsRegex: String(invisibleCharsRegex),
    regionDefinitions: regionDefinitions.map(({name, regex}) => ({name, regex: String(regex)})),
    rateRegionDefinitions: rateRegionDefinitions.map(({name, regex}) => ({name, regex: String(regex)})),
    functions: {toMatchableName: String(toMatchableName), getMatchedRegions: String(getMatchedRegions)},
  },
};
process.stdout.write(JSON.stringify(__payload));
'''
    export_code = export_code.replace("__CURRENT__", json.dumps(current, ensure_ascii=False))
    with tempfile.TemporaryDirectory() as temp_dir:
        runner = Path(temp_dir) / "upstream-export.js"
        runner.write_text(source + "\n" + export_code, encoding="utf-8", newline="\n")
        try:
            completed = subprocess.run(
                [os.environ.get("NODE_BIN", "node"), str(runner)], check=True,
                capture_output=True, text=True, encoding="utf-8", timeout=60,
            )
        except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
            raise BuildError(f"Unable to extract upstream JavaScript: {getattr(exc, 'stderr', '') or exc}") from exc
    try:
        return json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise BuildError("Upstream exporter returned invalid JSON") from exc


def _validate_provider(name: str, provider: Mapping[str, Any]) -> None:
    if not isinstance(provider, dict):
        raise BuildError(f"Provider {name} must be an object")
    if provider.get("type") not in {"http", "file", "inline"}:
        raise BuildError(f"Provider {name} has an unsupported type")
    if provider.get("behavior") not in {"domain", "ipcidr", "classical"}:
        raise BuildError(f"Provider {name} has an unsupported behavior")
    if provider.get("format", "yaml") not in {"mrs", "yaml", "text"}:
        raise BuildError(f"Provider {name} has an unsupported format")
    if provider["type"] == "http" and not isinstance(provider.get("url"), str):
        raise BuildError(f"HTTP provider {name} requires a URL")
    if provider["type"] == "file" and not isinstance(provider.get("path"), str):
        raise BuildError(f"File provider {name} requires a path")
    if provider["type"] == "inline" and not isinstance(provider.get("payload"), list):
        raise BuildError(f"Inline provider {name} requires a payload")


def replace_base_ruleset(
    name: str, provider: Mapping[str, Any], replacement: Mapping[str, str],
) -> tuple[str, dict[str, Any]]:
    """Replace only a reviewed ruleset filename, preserving the upstream CDN and fields."""
    if set(replacement) != {"name", "from", "to"} or any(
        not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_@.!-]+", value)
        for value in replacement.values()
    ):
        raise BuildError(f"Invalid base ruleset replacement for {name}")
    target_name = replacement["name"]
    old_suffix = "/" + replacement["from"] + ".mrs"
    new_suffix = "/" + replacement["to"] + ".mrs"
    updated = dict(provider)
    for field in ("url", "path", "path-in-bundle"):
        if field == "path-in-bundle" and field not in provider:
            continue
        value = provider.get(field)
        if not isinstance(value, str) or not value.endswith(old_suffix):
            raise BuildError(f"Base ruleset replacement source changed: {name}.{field}")
        updated[field] = value[:-len(old_suffix)] + new_suffix
    return target_name, updated


def _apply_url_override(provider: Mapping[str, Any], url: str | None) -> dict[str, Any]:
    updated = dict(provider)
    if url is not None:
        updated["url"] = url
        updated.pop("path-in-bundle", None)
    return updated


def selected_base_provider_names(extracted: Mapping[str, Any], manifest: Mapping[str, Any]) -> list[str]:
    excluded = set(manifest.get("excluded_base_rule_providers", []))
    return [name for name in extracted["baseRuleProviders"] if name not in excluded]


def select_upstream_definitions(
    extracted: Mapping[str, Any], manifest: Mapping[str, Any],
) -> tuple[dict[str, Any], dict[str, Any], list[str]]:
    """Follow current names; only explicit exclusions and actual collisions restrict selection."""
    excluded = set(manifest.get("excluded_services", []))
    services: dict[str, Any] = {}
    order: list[str] = []
    overrides = manifest.get("service_provider_url_overrides", {})
    for service in extracted["services"]:
        name = service["name"]
        if name in order:
            raise BuildError(f"Duplicate upstream service: {name}")
        order.append(name)
        if name in excluded or not service.get("rules"):
            continue
        providers = {}
        for provider_name, provider in service.get("providers", {}).items():
            _validate_provider(provider_name, provider)
            providers[provider_name] = _apply_url_override(provider, overrides.get(name, {}).get(provider_name))
        services[name] = {"providers": providers, "rules": list(service["rules"])}
    base = {}
    replacements = manifest.get("base_rule_provider_replacements", {})
    for name in selected_base_provider_names(extracted, manifest):
        provider = extracted["baseRuleProviders"][name]
        _validate_provider(name, provider)
        output_name = name
        if name in replacements:
            output_name, provider = replace_base_ruleset(name, provider, replacements[name])
        if output_name in base:
            raise BuildError(f"Duplicate base provider: {output_name}")
        base[output_name] = _apply_url_override(provider, manifest.get("base_rule_provider_url_overrides", {}).get(name))
    all_providers = dict(base)
    all_services = dict(services)
    for name, service in extracted.get("customServices", {}).items():
        if name in all_services:
            raise BuildError(f"Upstream/custom service name conflict: {name}")
        all_services[name] = service
    for service in all_services.values():
        for name, provider in service.get("providers", {}).items():
            if name in all_providers and all_providers[name] != provider:
                raise BuildError(f"Provider name conflict: {name}")
            all_providers[name] = provider
    for name, provider in extracted.get("customProviders", {}).items():
        if name in all_providers and all_providers[name] != provider:
            raise BuildError(f"Custom provider name conflict: {name}")
        all_providers[name] = provider
    for service in all_services.values():
        for rule in service.get("rules", []):
            validate_rule_references(rule, all_providers)
    return base, services, order


def split_rule(rule: str) -> list[str]:
    """Split rule columns while preserving nested logical expressions."""
    parts, start, depth = [], 0, 0
    escaped = False
    for index, char in enumerate(rule):
        if escaped:
            escaped = False
            continue
        if char == "\\":
            escaped = True
        elif char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
        elif char == "," and depth == 0:
            parts.append(rule[start:index])
            start = index + 1
    parts.append(rule[start:])
    return parts


def rule_policy_index(parts: list[str]) -> int:
    index = len(parts) - 1
    while index > 0 and parts[index] in {"no-resolve", "src", "dst"}:
        index -= 1
    if index < 1 or (parts[0] != "MATCH" and index < 2):
        raise BuildError("Rule is missing its policy: " + ",".join(parts))
    return index


def retarget_rule(rule: str, target: str) -> str:
    parts = split_rule(rule)
    parts[rule_policy_index(parts)] = target
    return ",".join(parts)


def validate_rule_references(rule: str, providers: Mapping[str, Any]) -> None:
    rule_policy_index(split_rule(rule))
    for name in re.findall(r"(?:^|[,(])RULE-SET,([^,()]+)", rule):
        if name not in providers:
            raise BuildError(f"Rule references missing provider {name}: {rule}")


def select_prefix_rules(extracted: Mapping[str, Any], manifest: Mapping[str, Any]) -> dict[str, list[str]]:
    """Place current upstream base rules using explicit local placement preferences."""
    result = {"bootstrap": [], "private": [], "direct": [], "fallback": []}
    excluded = set(manifest.get("upstream_prefix_rules", {}).get("excluded_rules", []))
    replacements = manifest.get("base_rule_provider_replacements", {})
    placements = manifest.get("base_rule_routing", {})
    hosts = {
        urllib.parse.urlsplit(provider.get("url", "")).hostname
        for provider in extracted["baseRuleProviders"].values()
    }
    entries: dict[str, list[tuple[int, int, str]]] = {key: [] for key in result}
    seen = set()
    source_rules = [(rule, "direct") for rule in extracted.get("prefixRules", [])]
    source_rules += [(rule, "fallback") for rule in extracted.get("fallbackRules", [])]
    for sequence, (rule, default_section) in enumerate(source_rules):
        if rule in excluded:
            continue
        parts = split_rule(rule)
        if parts[0] == "MATCH":
            continue
        source_name = parts[1] if parts[0] == "RULE-SET" else None
        preference = placements.get(source_name, {})
        section = preference.get("section", default_section)
        if parts[0] == "DOMAIN" and parts[1] in hosts:
            section = "bootstrap"
        if source_name:
            parts[1] = replacements.get(source_name, {}).get("name", source_name)
        policy_index = rule_policy_index(parts)
        original_policy = parts[policy_index]
        parts[policy_index] = {"直连": "Direct", "DIRECT": "Direct", "默认代理": "Proxy", "漏网之鱼": "Final"}.get(original_policy, original_policy)
        if preference.get("no_resolve") and "no-resolve" not in parts[policy_index + 1:]:
            parts.append("no-resolve")
        value = ",".join(parts)
        if value in seen:
            continue
        seen.add(value)
        entries[section].append((preference.get("order", sequence + 100), sequence, value))
    for section in result:
        result[section] = [rule for _priority, _sequence, rule in sorted(entries[section])]
    return result


def render_service_rule_blocks(
    services: Mapping[str, Any], extracted: Mapping[str, Any], manifest: Mapping[str, Any],
) -> tuple[dict[str, list[str]], list[dict[str, Any]]]:
    blocks = {"before_direct": [], "after_direct": []}
    plan = []
    combined = {**services, **extracted.get("customServices", {})}
    default = manifest.get("default_service_routing", {"target": "Proxy", "section": "after_direct", "order": 1000})
    for sequence, (name, service) in enumerate(combined.items()):
        route = {**default, **manifest.get("service_routing", {}).get(name, {})}
        if route["section"] not in blocks:
            raise BuildError(f"Invalid local routing section for {name}")
        plan.append({
            "name": name, "origin": "upstream" if name in services else "custom",
            "target": route["target"], "section": route["section"],
            "order": route["order"], "sequence": sequence,
            "rules": [retarget_rule(rule, route["target"]) for rule in service.get("rules", [])],
        })
    plan.sort(key=lambda item: (item["order"], item["sequence"]))
    for item in plan:
        blocks[item["section"]].extend(item["rules"])
    return blocks, plan


def sync_prefix_rules(
    current: str, prefix_rules: Mapping[str, Any],
) -> str:
    begin = "// BEGIN GENERATED: UPSTREAM_PREFIX_RULES"
    end = "// END GENERATED: UPSTREAM_PREFIX_RULES"
    if begin not in current and end not in current:
        anchor = "function buildRules() {"
        if current.count(anchor) != 1:
            raise BuildError("Expected one routing function for prefix rules")
        current = current.replace(anchor, begin + "\n" + end + "\n\n" + anchor)
    current = replace_marked(
        current, begin, end, render_const("upstreamPrefixRules", prefix_rules),
    )
    return current


def render_const(name: str, value: Any) -> str:
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

    # Remove the optional Android FCM filter and its unused minimal-mode variable.
    body = re.sub(r"(?m)^[ \t]*\.\.\.[^\n]*rule-set:googlefcm[^\n]*\r?\n?", "", body)
    body = re.sub(
        r"(?m)^[ \t]*const minimalModeEnabled = ruleOptionsEnable\.极简模式;\r?\n?",
        "", body,
    )

    # These upstream hosts are permanently excluded from the generated output.
    forbidden_hosts = (
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
        r"(?m)^[ \t]*// 屏蔽哔哩哔哩PCDN，解决访问视频/直播卡顿问题\r?\n?",
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


def sync_node_matching(current: str, contracts: Mapping[str, Any]) -> str:
    """Follow upstream regex changes while preserving local group definitions."""
    def replace_regex(text: str, prefix: str, value: str, label: str) -> str:
        if not isinstance(value, str) or not re.fullmatch(JS_REGEX_LITERAL, value):
            raise BuildError(f"Unsupported upstream matching expression: {label}")
        pattern = rf"(?P<prefix>{prefix}){JS_REGEX_LITERAL}(?P<suffix>\s*[,;])"
        updated, count = re.subn(
            pattern,
            lambda match: match.group("prefix") + value + match.group("suffix"),
            text, flags=re.MULTILINE,
        )
        if count != 1:
            raise BuildError(f"Expected exactly one local matching expression: {label}")
        return updated

    current = replace_regex(
        current, r"^const excludeFilter\s*=\s*",
        contracts["excludeFilter"], "excludeFilter",
    )

    def sync_definitions(text: str, declaration: str, values: Mapping[str, str]) -> str:
        pattern = rf"(?ms)^const {declaration} = \[(?P<body>.*?)^\];"
        def replace_block(match: re.Match[str]) -> str:
            body = match.group("body")
            for name, value in values.items():
                name_pattern = (
                    r"lowRateRegionName" if name == "低倍率节点"
                    else rf"""(?P<quote>['"]){re.escape(name)}(?P=quote)"""
                )
                body = replace_regex(
                    body, rf"name:\s*{name_pattern},\s*regex:\s*", value, name,
                )
            return f"const {declaration} = [" + body + "];"
        updated, count = re.subn(pattern, replace_block, text)
        if count != 1:
            raise BuildError(f"Expected exactly one local definition block: {declaration}")
        return updated

    regions = {item["name"]: item["regex"] for item in contracts["regionDefinitions"]}
    current = sync_definitions(
        current, "regionDefinitions",
        {name: value for name, value in regions.items() if name in SYNC_REGION_NAMES},
    )
    rates = {item["name"]: item["regex"] for item in contracts["rateRegionDefinitions"]}
    return sync_definitions(
        current, "rateRegionDefinitions",
        {name: value for name, value in rates.items() if name == "低倍率节点"},
    )


def sync_matching_helpers(current: str, contracts: Mapping[str, Any]) -> str:
    """Copy current upstream matching helpers while preserving original node names."""
    regex = contracts.get("invisibleCharsRegex")
    if not isinstance(regex, str) or not re.fullmatch(JS_REGEX_LITERAL, regex):
        raise BuildError("Unsupported upstream invisible-character matching expression")
    declaration = f"const invisibleCharsRegex = {regex};"
    pattern = r"(?m)^const invisibleCharsRegex\s*=\s*[^\n]+$"
    declarations = len(re.findall(pattern, current))
    if declarations == 0:
        anchor = "const regionMatchCache = new Map();"
        if current.count(anchor) != 1:
            raise BuildError("Expected exactly one local region-match cache")
        current = current.replace(anchor, declaration + "\n\n" + anchor)
    elif declarations == 1:
        current = re.sub(pattern, lambda _match: declaration, current)
    else:
        raise BuildError("Duplicate local invisible-character matching expression")

    for name in ("toMatchableName", "getMatchedRegions"):
        source = contracts["functions"].get(name)
        pattern = rf"(?ms)^function {name}\([^\n]*\) \{{.*?^\}}"
        if not isinstance(source, str) or not re.fullmatch(pattern, source):
            raise BuildError(f"Unsupported upstream matching helper: {name}")
        count = len(re.findall(pattern, current))
        if count == 0 and name == "toMatchableName":
            anchor = "const regionMatchCache = new Map();"
            if current.count(anchor) != 1:
                raise BuildError("Expected exactly one local region-match cache")
            current = current.replace(anchor, source + "\n\n" + anchor)
        elif count == 1:
            current = re.sub(pattern, lambda _match: source, current)
        else:
            raise BuildError(f"Expected exactly one local matching helper: {name}")
    return current



def sync_group_icons(
    current: str, extracted: Mapping[str, Any], manifest: Mapping[str, Any],
) -> tuple[str, dict[str, str]]:
    """Read icon URLs from upstream group definitions, including renamed local groups."""
    source_icons = extracted["icons"]
    selected: dict[str, str] = {}
    for name, upstream_name in manifest["group_icon_sources"].items():
        icon = source_icons.get(upstream_name)
        if icon is not None:
            selected[name] = icon
    begin = "// BEGIN GENERATED: GROUP_ICONS"
    end = "// END GENERATED: GROUP_ICONS"
    if begin not in current and end not in current:
        anchor = "function buildProxyGroups("
        if current.count(anchor) != 1:
            raise BuildError("Expected one proxy-group builder for SVG icons")
        current = current.replace(anchor, begin + "\n" + end + "\n\n" + anchor)
    return replace_marked(current, begin, end, render_const("groupIcons", selected)), selected


def sync_group_test_url(current: str, extracted: Mapping[str, Any]) -> tuple[str, str | None]:
    """Follow the upstream test URL while keeping manual select groups on interval zero."""
    url = extracted.get("groupTestUrl")
    begin = "// BEGIN GENERATED: GROUP_TEST_URL"
    end = "// END GENERATED: GROUP_TEST_URL"
    if begin not in current and end not in current:
        anchor = "function buildProxyGroups("
        if current.count(anchor) != 1:
            raise BuildError("Expected one proxy-group builder for the test URL")
        current = current.replace(anchor, begin + "\n" + end + "\n\n" + anchor)
    return replace_marked(current, begin, end, render_const("groupTestUrl", url)), url

def render_script(
    current: str,
    upstream: str,
    sha: str,
    base: Mapping[str, Any],
    services: Mapping[str, Any],
    real_ip_domains: list[str],
) -> str:
    updated, count = re.subn(
        r"(?m)^ \* 上游提交：[0-9a-f]{40}$",
        f" * 上游提交：{sha}",
        current,
    )
    if count != 1:
        raise BuildError("Generated script must contain exactly one upstream commit header")
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
        "// 从本轮上游提取；保留当前服务和规则集原名\n"
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
) -> tuple[str, str]:
    extracted = _extract_with_node(upstream, current_script)
    base, services, service_order = select_upstream_definitions(extracted, manifest)
    prefix_rules = select_prefix_rules(extracted, manifest)
    service_blocks, routing_plan = render_service_rule_blocks(services, extracted, manifest)
    available_providers = dict(base)
    for service in (*services.values(), *extracted.get("customServices", {}).values()):
        available_providers.update(service.get("providers", {}))
    available_providers.update(extracted.get("customProviders", {}))
    for rules in prefix_rules.values():
        for rule in rules:
            validate_rule_references(rule, available_providers)
    applied_domains, excluded_domains = select_real_ip_domains(real_ip_domains)
    current_script = sync_node_matching(current_script, extracted["contracts"])
    current_script = sync_matching_helpers(current_script, extracted["contracts"])
    script = render_script(current_script, upstream, sha, base, services, applied_domains)
    script = sync_prefix_rules(script, prefix_rules)
    script = replace_marked(
        script, "// BEGIN GENERATED: SERVICE_RULE_BLOCKS", "// END GENERATED: SERVICE_RULE_BLOCKS",
        render_const("serviceRuleBlocks", service_blocks),
    )
    script, group_icons = sync_group_icons(script, extracted, manifest)
    script, group_test_url = sync_group_test_url(script, extracted)
    report = {
        "schema_version": 1,
        "upstream": {
            "repository": manifest["upstream"]["repository"],
            "path": manifest["upstream"]["path"],
            "commit": sha,
        },
        "upstream_matching": {
            "invisibleCharsRegex": extracted["contracts"]["invisibleCharsRegex"],
            "functions": {
                name: extracted["contracts"]["functions"][name]
                for name in ("toMatchableName", "getMatchedRegions")
            },
            "excludeFilter": extracted["contracts"]["excludeFilter"],
            "regionDefinitions": [
                item for item in extracted["contracts"]["regionDefinitions"]
                if item["name"] in SYNC_REGION_NAMES
            ],
            "rateRegionDefinitions": [
                item for item in extracted["contracts"]["rateRegionDefinitions"]
                if item["name"] == "低倍率节点"
            ],
        },
        "upstream_group_test_url": group_test_url,
        "group_test_interval": 0,
        "upstream_group_icons": extracted["icons"],
        "group_icon_sources": manifest["group_icon_sources"],
        "applied_group_icons": group_icons,
        "output_sha256": hashlib.sha256(script.encode("utf-8")).hexdigest(),
        "real_ip_domains_upstream": {
            "repository": manifest["real_ip_domains_upstream"]["repository"],
            "path": manifest["real_ip_domains_upstream"]["path"],
            "commit": real_ip_domains_sha,
            "domains": real_ip_domains,
            "applied_domains": applied_domains,
            "excluded_domains": excluded_domains,
        },
        # Record unmodified definitions from the pinned upstream revision.
        # Explicit ruleset replacements and custom URL overrides are recorded below.
        "upstream_prefix_rules": extracted["prefixRules"],
        "upstream_fallback_rules": extracted["fallbackRules"],
        "service_routing_plan": routing_plan,
        "applied_service_rule_blocks": service_blocks,
        "excluded_services": manifest.get("excluded_services", []),
        "excluded_base_rule_providers": manifest.get("excluded_base_rule_providers", []),
        "prefix_rule_policy": manifest.get("upstream_prefix_rules", {}),
        "applied_prefix_rules": prefix_rules,
        "upstream_base_rule_providers": {
            name: extracted["baseRuleProviders"][name] for name in selected_base_provider_names(extracted, manifest)
        },
        "upstream_service_rule_providers": {
            service["name"]: service["providers"]
            for service in extracted["services"] if service["name"] in services
        },
        "retained_base_rule_providers": list(base),
        "base_rule_provider_replacements": manifest.get("base_rule_provider_replacements", {}),
        "base_rule_provider_url_overrides": manifest.get("base_rule_provider_url_overrides", {}),
        "service_provider_url_overrides": manifest.get("service_provider_url_overrides", {}),
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
    args = parser.parse_args()
    try:
        manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
        sha, upstream_head, upstream = resolve_fork_upstream(manifest)
        real_ip_domains_sha, _url, real_ip_source = resolve_upstream(manifest, "real_ip_domains_upstream")
        real_ip_domains = extract_real_ip_domains(real_ip_source)
        output_path = ROOT / manifest["output"]
        report_path = ROOT / manifest["report"]
        current = output_path.read_text(encoding="utf-8")
        script, report = build(
            manifest, current, upstream, sha, real_ip_domains, real_ip_domains_sha
        )
        report_data = json.loads(report)
        report_data["fork"] = {
            "source_mode": "native-git-merge",
            "upstream_commit": upstream_head,
            "source_path": manifest["upstream"]["path"],
            "source_sha256": hashlib.sha256(upstream.encode("utf-8")).hexdigest(),
        }
        report = json.dumps(report_data, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
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
