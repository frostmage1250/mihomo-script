from __future__ import annotations

import sys
import unittest
import tempfile
from unittest.mock import patch
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "custom"))

from build_mihomo_script import (  # noqa: E402
    BuildError,
    resolve_fork_upstream,
    contract_hashes,
    sync_node_matching,
    sync_matching_helpers,
    validate_contracts,
    detect_service_renames,
    extract_real_ip_domains,
    select_real_ip_domains,
    replace_marked,
    render_dns_section,
    render_script,
    select_upstream_definitions,
    selected_base_provider_names,
    select_prefix_rules,
    sync_prefix_rules,
)


class BuilderTests(unittest.TestCase):
    def test_fork_source_uses_native_history_and_rejects_local_source_drift(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "Script").mkdir()
            source_path = root / "Script" / "mihomoScript.js"
            source_path.write_text("const source = 'upstream';\n", encoding="utf-8")
            manifest = {"upstream": {"path": "Script/mihomoScript.js"}}
            outputs = ["a" * 40 + "\n", "b" * 40 + "\n", "const source = 'upstream';\n"]
            with patch("build_mihomo_script.ROOT", root), patch(
                "build_mihomo_script.subprocess.check_output", side_effect=outputs,
            ):
                sha, head, source = resolve_fork_upstream(manifest)
                self.assertEqual((sha, head, source), ("b" * 40, "a" * 40, "const source = 'upstream';\n"))
            source_path.write_text("const source = 'changed';\n", encoding="utf-8")
            with patch("build_mihomo_script.ROOT", root), patch(
                "build_mihomo_script.subprocess.check_output", side_effect=outputs,
            ), self.assertRaisesRegex(BuildError, "must match the merged upstream"):
                resolve_fork_upstream(manifest)

    def test_upstream_taiwan_removal_is_accepted_but_other_regions_are_guarded(self) -> None:
        contracts = {
            "excludeFilter": "/information/i",
            "commonDnsList": [],
            "directProxies": [],
            "regionDefinitions": [
                {"name": name, "regex": f"/{name}/i"}
                for name in ("香港", "日本", "美国", "新加坡", "台湾省")
            ],
            "rateRegionDefinitions": [{"name": "低倍率节点", "regex": "/low/i"}],
            "functions": {},
        }
        manifest = {"upstream_contract_hashes": contract_hashes(contracts)}
        contracts["regionDefinitions"] = [
            region for region in contracts["regionDefinitions"] if region["name"] != "台湾省"
        ]
        validate_contracts({"contracts": contracts}, manifest)
        contracts["regionDefinitions"] = [
            region for region in contracts["regionDefinitions"] if region["name"] != "香港"
        ]
        with self.assertRaisesRegex(BuildError, "Required upstream region definition disappeared: 香港"):
            validate_contracts({"contracts": contracts}, manifest)

    def test_matching_changes_follow_upstream_but_functions_remain_guarded(self) -> None:
        contracts = {
            "excludeFilter": "/old/i",
            "commonDnsList": [],
            "directProxies": [],
            "regionDefinitions": [
                {"name": name, "regex": "/old/i"}
                for name in ("香港", "日本", "美国", "新加坡")
            ],
            "rateRegionDefinitions": [{"name": "低倍率节点", "regex": "/old/i"}],
            "functions": {"filterAndNormalizeProxies": "old"},
        }
        manifest = {"upstream_contract_hashes": contract_hashes(contracts)}
        contracts["excludeFilter"] = "/new/iu"
        for region in contracts["regionDefinitions"]:
            region["regex"] = "/new/i"
        contracts["rateRegionDefinitions"][0]["regex"] = "/new/i"
        validate_contracts({"contracts": contracts}, manifest)
        contracts["functions"]["filterAndNormalizeProxies"] = "changed"
        with self.assertRaisesRegex(BuildError, "function:filterAndNormalizeProxies"):
            validate_contracts({"contracts": contracts}, manifest)
        contracts["functions"]["filterAndNormalizeProxies"] = "old"
        contracts["rateRegionDefinitions"] = []
        with self.assertRaisesRegex(BuildError, "Required upstream low-rate definition disappeared"):
            validate_contracts({"contracts": contracts}, manifest)

    def test_sync_matching_preserves_local_taiwan_and_is_deterministic(self) -> None:
        current = """const excludeFilter = /old/i;
const regionDefinitions = [
  { name: '香港', regex: /old/i, },
  { name: '日本', regex: /old/i, },
  { name: '美国', regex: /old/i, },
  { name: '新加坡', regex: /old/i, },
  { name: '台湾省', regex: /local-taiwan/i, },
];
const rateRegionDefinitions = [
  { name: lowRateRegionName, regex: /old/i, },
];
const policy = 'unchanged';
"""
        contracts = {
            "excludeFilter": r"/new\sfilter/iu",
            "regionDefinitions": [
                {"name": name, "regex": f"/new-{name}/i"}
                for name in ("香港", "日本", "美国", "新加坡", "台湾省")
            ],
            "rateRegionDefinitions": [
                {"name": "低倍率节点", "regex": r"/【x0】|\s0倍/i"},
                {"name": "高倍率节点", "regex": "/high/i"},
            ],
        }
        rendered = sync_node_matching(current, contracts)
        self.assertIn(r"/new\sfilter/iu", rendered)
        for name in ("香港", "日本", "美国", "新加坡"):
            self.assertIn(f"/new-{name}/i", rendered)
        self.assertIn(r"/【x0】|\s0倍/i", rendered)
        self.assertIn("/local-taiwan/i", rendered)
        self.assertNotIn("/new-台湾省/i", rendered)
        self.assertNotIn("/high/i", rendered)
        self.assertIn("const policy = 'unchanged';", rendered)
        self.assertEqual(sync_node_matching(rendered, contracts), rendered)
        with self.assertRaisesRegex(BuildError, "exactly one local matching expression"):
            sync_node_matching(current.replace("name: '香港'", "name: 'missing'"), contracts)
        with self.assertRaisesRegex(BuildError, "exactly one local matching expression"):
            sync_node_matching(current + "const excludeFilter = /duplicate/i;\n", contracts)
        with self.assertRaisesRegex(BuildError, "Unsupported upstream matching expression"):
            sync_node_matching(current, {**contracts, "excludeFilter": "not a regex"})

    def test_reviewed_function_sources_reject_changes_and_missing_functions(self) -> None:
        contracts = {
            "excludeFilter": "/info/i", "commonDnsList": [], "directProxies": [],
            "regionDefinitions": [
                {"name": name, "regex": "/region/i"}
                for name in ("香港", "日本", "美国", "新加坡")
            ],
            "rateRegionDefinitions": [{"name": "低倍率节点", "regex": "/low/i"}],
            "functions": {"toMatchableName": "reviewed"},
        }
        manifest = {
            "upstream_contract_hashes": {},
            "upstream_contract_sources": {"function:toMatchableName": "reviewed"},
        }
        validate_contracts({"contracts": contracts}, manifest)
        contracts["functions"]["toMatchableName"] = "unreviewed"
        with self.assertRaisesRegex(BuildError, "changed: function:toMatchableName"):
            validate_contracts({"contracts": contracts}, manifest)
        contracts["functions"].clear()
        with self.assertRaisesRegex(BuildError, "missing: function:toMatchableName"):
            validate_contracts({"contracts": contracts}, manifest)

    def test_matching_helpers_are_installed_once_and_fail_on_ambiguous_input(self) -> None:
        current = """const regionMatchCache = new Map();
function getMatchedRegions(proxyName) {
  return [];
}
const preserveName = 'H\\u200BK';
"""
        contracts = {
            "invisibleCharsRegex": r"/[\u200B]/g",
            "functions": {
                "toMatchableName": """function toMatchableName(name) {
  return name.replace(invisibleCharsRegex, '');
}""",
                "getMatchedRegions": """function getMatchedRegions(proxyName) {
  return toMatchableName(proxyName);
}""",
            },
        }
        rendered = sync_matching_helpers(current, contracts)
        self.assertIn(r"const invisibleCharsRegex = /[\u200B]/g;", rendered)
        self.assertIn(contracts["functions"]["toMatchableName"], rendered)
        self.assertIn(contracts["functions"]["getMatchedRegions"], rendered)
        self.assertIn("const preserveName = 'H\\u200BK';", rendered)
        self.assertEqual(sync_matching_helpers(rendered, contracts), rendered)
        with self.assertRaisesRegex(BuildError, "Unsupported upstream invisible-character"):
            sync_matching_helpers(current, {**contracts, "invisibleCharsRegex": "invalid"})
        with self.assertRaisesRegex(BuildError, "exactly one local matching helper"):
            sync_matching_helpers(current + contracts["functions"]["getMatchedRegions"], contracts)
        with self.assertRaisesRegex(BuildError, "exactly one local region-match cache"):
            sync_matching_helpers(current.replace("const regionMatchCache = new Map();", ""), contracts)

    def test_github_split_remains_selected_separately_from_microsoft(self) -> None:
        provider = {
            "type": "http", "format": "mrs", "interval": 86400,
            "behavior": "domain", "url": "https://example.com/github.mrs",
            "path": "./ruleset/github.mrs",
        }
        extracted = {
            "baseRuleProviders": {},
            "services": [
                {"name": "GitHub", "providers": {"github": provider},
                 "rules": ["RULE-SET,github,GitHub"]},
                {"name": "Microsoft", "providers": {"microsoft": provider},
                 "rules": ["RULE-SET,microsoft,Microsoft"]},
            ],
        }
        manifest = {
            "retained_services": ["GitHub", "Microsoft"],
            "retained_base_rule_providers": [], "reserved_extra_provider_names": [],
        }
        _base, services, renames, _order = select_upstream_definitions(
            extracted, manifest, ["Microsoft"]
        )
        self.assertEqual(services["GitHub"]["rules"], ["RULE-SET,github,GitHub"])
        self.assertEqual(list(services["Microsoft"]["providers"]), ["microsoft"])
        self.assertEqual(renames, {})

    def test_marked_region_is_replaced_once(self) -> None:
        text = "before\n// BEGIN\nold\n// END\nafter\n"
        self.assertEqual(
            replace_marked(text, "// BEGIN", "// END", "new"),
            "before\n// BEGIN\nnew\n// END\nafter\n",
        )

    def test_missing_or_duplicate_markers_fail(self) -> None:
        with self.assertRaises(BuildError):
            replace_marked("no markers", "// BEGIN", "// END", "new")
        with self.assertRaises(BuildError):
            replace_marked("// BEGIN\n// BEGIN\n// END", "// BEGIN", "// END", "new")

    def test_render_is_deterministic_and_updates_commit(self) -> None:
        template = """/**
 * 上游提交：0000000000000000000000000000000000000000
 */
// BEGIN GENERATED: BASE_RULE_PROVIDERS
old
// END GENERATED: BASE_RULE_PROVIDERS
// BEGIN GENERATED: RETAINED_SERVICES
old
// END GENERATED: RETAINED_SERVICES
// ---dns和hosts相关处理---
old dns
// --- 单订阅输出层 ---
const config = {
  tun: {
    stack: 'system',
  },
};
"""
        upstream = """// ---dns和hosts相关处理---
const foreignDNS = ['https://dns.example/dns-query#默认代理'];
const dns = {
  'fake-ip-filter': [
    'rule-set:private',
  ],
  'nameserver-policy': {
    'rule-set:cn': chinaDNS,
  },
  'direct-nameserver': chinaDNS,
};
// --- 主入口 ---
newConfig['tun'] = {
  stack: 'mips',
};
"""
        sha = "1" * 40
        first = render_script(template, upstream, sha, {"a": {"x": 1}}, {"S": {"providers": {}, "rules": []}}, {}, ["example.com"])
        second = render_script(first, upstream, sha, {"a": {"x": 1}}, {"S": {"providers": {}, "rules": []}}, {}, ["example.com"])
        self.assertEqual(first, second)
        self.assertIn(f"上游提交：{sha}", first)
        self.assertIn("stack: 'mips'", first)

    def test_dns_section_tracks_upstream_but_keeps_system_dns_invariants(self) -> None:
        upstream = """// ---dns和hosts相关处理---
const commonDnsList = ['dns.apple'];
const foreignDNS = ['https://dns.example/dns-query#默认代理'];
const dns = {
  'fake-ip-filter': [
    'rule-set:private',
    ...(ruleOptionsEnable['FCM'] ? ['rule-set:googlefcm'] : []),
  ],
  'nameserver-policy': {
    'rule-set:private': 'system',
    'rule-set:douyin': ['system', '180.184.1.1', '180.184.2.2'],
    'rule-set:cn': chinaDNS,
  },
  'direct-nameserver': chinaDNS,
  'direct-nameserver-follow-policy': true,
};
const hosts = {
  'services.googleapis.cn': 'services.googleapis.com',
  '+.mcdn.bilivideo.com': ['0.0.0.0'],
};
// --- 主入口 ---
"""
        rendered = render_dns_section(upstream, ["example.com", "*.xboxlive.com"])
        self.assertIn("'dns.apple'", rendered)
        self.assertIn("'services.googleapis.cn': 'services.googleapis.com'", rendered)
        self.assertNotIn("mcdn.bilivideo.com", rendered)
        self.assertIn("#Proxy", rendered)
        self.assertIn("'rule-set:private': 'system'", rendered)
        self.assertIn("'rule-set:douyin': ['system', '180.184.1.1', '180.184.2.2']", rendered)
        self.assertIn("'rule-set:cn': ['system']", rendered)
        self.assertIn("'direct-nameserver': ['system']", rendered)
        self.assertIn("'direct-nameserver-follow-policy': true", rendered)
        self.assertNotIn("googlefcm", rendered)
        self.assertIn("...repczRealIpDomains", rendered)
        self.assertIn('"*.xboxlive.com"', rendered)
        self.assertNotIn("DOMAIN-REGEX", rendered)

    def test_extract_and_select_repcz_real_ip_domains(self) -> None:
        source = """dns:
  bootstrap:
  - system
real_ip_domains:
- lancache.steamcontent.com
- '*.xboxlive.com'
- '*-update.xoyocdn.com'
- '*-appboot.netflix.com'
policy_groups:
- external:
    name: Manual
"""
        domains = extract_real_ip_domains(source)
        self.assertEqual(domains, [
            "lancache.steamcontent.com",
            "*.xboxlive.com",
            "*-update.xoyocdn.com",
            "*-appboot.netflix.com",
        ])
        applied, excluded = select_real_ip_domains(domains)
        self.assertEqual(applied, ["lancache.steamcontent.com", "*.xboxlive.com"])
        self.assertEqual(excluded, ["*-update.xoyocdn.com", "*-appboot.netflix.com"])
        with self.assertRaises(BuildError):
            select_real_ip_domains(["*-new.example.com"])
        with self.assertRaises(BuildError):
            extract_real_ip_domains("dns:\n  bootstrap:\n  - system\n")
        with self.assertRaises(BuildError):
            extract_real_ip_domains("real_ip_domains:\n- '*-update.xoyocdn.com/evil'\n")

    def test_retained_service_provider_additions_are_accepted(self) -> None:
        provider = {
            "type": "http",
            "format": "mrs",
            "interval": 86400,
            "behavior": "domain",
            "url": "https://example.com/service.mrs",
            "path": "./ruleset/service.mrs",
        }
        ip_provider = {
            **provider,
            "behavior": "ipcidr",
            "url": "https://example.com/service-ip.mrs",
            "path": "./ruleset/service-ip.mrs",
        }
        extracted = {
            "baseRuleProviders": {},
            "services": [
                {
                    "name": "Service",
                    "providers": {"service": provider, "service_ip": ip_provider},
                    "rules": [
                        "RULE-SET,service,Service",
                        "RULE-SET,service_ip,Service,no-resolve",
                    ],
                }
            ],
        }
        manifest = {
            "retained_services": ["Service"],
            "retained_base_rule_providers": [],
            "reserved_extra_provider_names": [],
        }

        _base, services, _renames, _order = select_upstream_definitions(extracted, manifest)

        self.assertEqual(list(services["Service"]["providers"]), ["service", "service_ip"])


    def test_ordinary_base_and_service_providers_follow_upstream_fields(self) -> None:
        old_provider = {
            "type": "http", "format": "mrs", "interval": 86400,
            "behavior": "domain",
            "url": "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/douyin.mrs",
            "path": "./ruleset/douyin.mrs",
            "path-in-bundle": "geo/geosite/douyin.mrs",
        }
        upstream_provider = {
            **old_provider,
            "url": "https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/geosite/douyin.mrs",
            "path": "./ruleset/upstream-douyin.mrs",
            "path-in-bundle": "geo/geosite/upstream-douyin.mrs",
            "interval": 21600,
            "proxy": "DIRECT",
        }
        extracted = {
            "baseRuleProviders": {"douyin": upstream_provider},
            "services": [{
                "name": "Service",
                "providers": {"service": {**upstream_provider, "url": "https://new-cdn.example/service.mrs"}},
                "rules": ["RULE-SET,service,Service"],
            }],
        }
        manifest = {
            "retained_services": ["Service"],
            "retained_base_rule_providers": ["douyin"],
            "reserved_extra_provider_names": [],
        }
        base, services, _renames, _order = select_upstream_definitions(extracted, manifest)
        self.assertEqual(base["douyin"], upstream_provider)
        self.assertNotEqual(base["douyin"], old_provider)
        self.assertEqual(services["Service"]["providers"], extracted["services"][0]["providers"])

    def test_base_ruleset_replacement_inherits_upstream_mirror_and_fields(self) -> None:
        provider = {
            "type": "http", "format": "mrs", "interval": 21600, "behavior": "domain",
            "url": "https://new-cdn.example/gh/appshubcc/bett-rules@meta/geo/geosite/category-games@cn.mrs",
            "path": "./ruleset/category-games@cn.mrs",
            "path-in-bundle": "geo/geosite/category-games@cn.mrs",
            "proxy": "DIRECT",
        }
        extracted = {"baseRuleProviders": {"games_cn": provider}, "services": []}
        manifest = {
            "retained_services": [], "retained_base_rule_providers": ["games_cn"],
            "reserved_extra_provider_names": [],
            "base_rule_provider_replacements": {
                "games_cn": {"name": "steam_cn", "from": "category-games@cn", "to": "steam@cn"},
            },
        }
        base, _services, _renames, _order = select_upstream_definitions(extracted, manifest)
        self.assertEqual(list(base), ["steam_cn"])
        self.assertEqual(base["steam_cn"], {
            **provider,
            "url": "https://new-cdn.example/gh/appshubcc/bett-rules@meta/geo/geosite/steam@cn.mrs",
            "path": "./ruleset/steam@cn.mrs",
            "path-in-bundle": "geo/geosite/steam@cn.mrs",
        })
        self.assertTrue(provider["url"].endswith("/category-games@cn.mrs"))

    def test_base_ruleset_replacement_rejects_source_drift_and_collisions(self) -> None:
        provider = {
            "type": "http", "format": "mrs", "interval": 86400, "behavior": "domain",
            "url": "https://cdn.example/geosite/category-games@cn.mrs",
            "path": "./ruleset/category-games@cn.mrs",
            "path-in-bundle": "geo/geosite/category-games@cn.mrs",
        }
        manifest = {
            "retained_services": [], "retained_base_rule_providers": ["games_cn"],
            "reserved_extra_provider_names": [],
            "base_rule_provider_replacements": {
                "games_cn": {"name": "steam_cn", "from": "category-games@cn", "to": "steam@cn"},
            },
        }
        for field in ("url", "path", "path-in-bundle"):
            with self.subTest(field=field):
                drifted = {**provider, field: provider[field].replace("category-games@cn", "changed")}
                with self.assertRaisesRegex(BuildError, "replacement source changed"):
                    select_upstream_definitions({"baseRuleProviders": {"games_cn": drifted}, "services": []}, manifest)
        with self.assertRaisesRegex(BuildError, "name collision"):
            select_upstream_definitions(
                {"baseRuleProviders": {"games_cn": provider}, "services": []},
                {**manifest, "reserved_extra_provider_names": ["steam_cn"]},
            )

    def test_prefix_rules_follow_upstream_with_explicit_exclusions_and_replacements(self) -> None:
        extracted = {
            "baseRuleProviders": {
                name: {"url": "https://mirror.example/" + name + ".mrs"}
                for name in ("private", "games_cn", "nvidia_cn", "future_cn", "geolocation-cn")
            },
            "prefixRules": [
                "DOMAIN,mirror.example,直连",
                "RULE-SET,private,直连",
                "RULE-SET,geolocation-cn,直连",
                "RULE-SET,games_cn,直连",
                "RULE-SET,epicgames,直连",
                "RULE-SET,nvidia_cn,直连",
                "DOMAIN,international-gfe.download.nvidia.com,直连",
                "DOMAIN-SUFFIX,ctaiot.com,直连",
                "DOMAIN,fsend.cn,直连",
                "RULE-SET,future_cn,直连",
                "IP-CIDR,192.0.2.0/24,直连,no-resolve",
                "DOMAIN-SUFFIX,ctaiot.com,直连",
            ],
        }
        manifest = {
            "retained_base_rule_providers": ["private", "games_cn", "nvidia_cn", "geolocation-cn"],
            "base_rule_provider_replacements": {"games_cn": {"name": "steam_cn"}},
            "upstream_prefix_rules": {
                "excluded_rules": ["DOMAIN,fsend.cn,直连", "RULE-SET,epicgames,直连"],
                "existing_rule_providers": ["private", "geolocation-cn"],
            },
        }
        selected = select_prefix_rules(extracted, manifest)
        self.assertEqual(selected, {
            "bootstrap": ["DOMAIN,mirror.example,Direct"],
            "direct": [
                "RULE-SET,steam_cn,Direct", "RULE-SET,nvidia_cn,Direct",
                "DOMAIN,international-gfe.download.nvidia.com,Direct",
                "DOMAIN-SUFFIX,ctaiot.com,Direct", "RULE-SET,future_cn,Direct",
                "IP-CIDR,192.0.2.0/24,Direct,no-resolve",
            ],
        })
        self.assertEqual(selected_base_provider_names(extracted, manifest), [
            "private", "games_cn", "nvidia_cn", "geolocation-cn", "future_cn",
        ])
        changed = {**extracted, "prefixRules": [
            "DOMAIN,next-mirror.example,直连", "DOMAIN-SUFFIX,new.example,直连",
        ], "baseRuleProviders": {
            name: {"url": "https://next-mirror.example/" + name + ".mrs"}
            for name in extracted["baseRuleProviders"]
        }}
        self.assertEqual(select_prefix_rules(changed, manifest), {
            "bootstrap": ["DOMAIN,next-mirror.example,Direct"],
            "direct": ["DOMAIN-SUFFIX,new.example,Direct"],
        })
        for rule in ("DOMAIN-SUFFIX,example.com,Proxy", "MATCH,直连", "RULE-SET,a,直连,invalid"):
            with self.subTest(rule=rule), self.assertRaisesRegex(BuildError, "requires review"):
                select_prefix_rules({**extracted, "prefixRules": [rule]}, manifest)

    def test_new_prefix_provider_inherits_complete_upstream_definition(self) -> None:
        provider = {
            "type": "http", "format": "mrs", "interval": 21600, "behavior": "domain",
            "url": "https://new-mirror.example/new.mrs", "path": "./ruleset/new.mrs",
            "path-in-bundle": "geo/geosite/new.mrs", "proxy": "DIRECT",
        }
        extracted = {
            "baseRuleProviders": {"new_cn": provider}, "services": [],
            "prefixRules": ["RULE-SET,new_cn,直连"],
        }
        manifest = {
            "retained_services": [], "retained_base_rule_providers": [],
            "reserved_extra_provider_names": [],
        }
        base, _services, _renames, _order = select_upstream_definitions(extracted, manifest)
        self.assertEqual(base, {"new_cn": provider})
        with self.assertRaisesRegex(BuildError, "disappeared: new_cn"):
            select_upstream_definitions({**extracted, "baseRuleProviders": {}}, manifest)

    def test_prefix_rendering_replaces_removed_rules_and_provider_selection(self) -> None:
        template = """const selectedBaseRuleProviderNames = [
  'old',
];
function buildRules() {
  return [...upstreamPrefixRules.bootstrap, ...upstreamPrefixRules.direct, 'MATCH,Final'];
}
"""
        rules = {"bootstrap": ["DOMAIN,mirror.example,Direct"], "direct": ["RULE-SET,new_cn,Direct"]}
        first = sync_prefix_rules(template, rules, {"new_cn": {}})
        self.assertEqual(sync_prefix_rules(first, rules, {"new_cn": {}}), first)
        self.assertIn('"RULE-SET,new_cn,Direct"', first)
        self.assertIn('"new_cn"', first)
        self.assertNotIn("'old'", first)
        second = sync_prefix_rules(first, {"bootstrap": [], "direct": []}, {})
        self.assertNotIn('"RULE-SET,new_cn,Direct"', second)
        with self.assertRaisesRegex(BuildError, "Expected one selected base"):
            sync_prefix_rules(first.replace("const selectedBaseRuleProviderNames", "const otherNames"), rules, {})

    def test_ai_provider_uses_converter_url_without_bett_bundle_path(self) -> None:
        provider = {
            "type": "http", "format": "mrs", "interval": 86400,
            "behavior": "domain", "url": "https://bett.example/ai.mrs",
            "path": "./ruleset/ai.mrs",
            "path-in-bundle": "geo/geosite/category-ai-!cn.mrs",
        }
        extracted = {
            "baseRuleProviders": {},
            "services": [{"name": "AI", "providers": {"ai": provider}, "rules": ["RULE-SET,ai,AI"]}],
        }
        manifest = {
            "retained_services": ["AI"],
            "retained_base_rule_providers": [],
            "reserved_extra_provider_names": [],
            "service_provider_url_overrides": {
                "AI": {"ai": "https://raw.githubusercontent.com/example/ai.mrs"}
            },
        }
        _base, services, _renames, _order = select_upstream_definitions(extracted, manifest)
        self.assertEqual(services["AI"]["providers"]["ai"]["url"], manifest["service_provider_url_overrides"]["AI"]["ai"])
        self.assertNotIn("path-in-bundle", services["AI"]["providers"]["ai"])
        self.assertEqual(provider["url"], "https://bett.example/ai.mrs")

    def test_service_rename_is_detected_without_treating_new_additions_as_renames(self) -> None:
        self.assertEqual(
            detect_service_renames(
                ["Twitter", "Instagram", "PikPak"],
                ["Twitter", "Meta", "Line", "PikPak"],
            ),
            {"Instagram": "Meta"},
        )

if __name__ == "__main__":
    unittest.main()
