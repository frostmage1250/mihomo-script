from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "custom"))

from build_mihomo_script import (
    BuildError, extract_real_ip_domains, select_real_ip_domains,
    resolve_fork_upstream, select_upstream_definitions, select_prefix_rules,
    render_service_rule_blocks, retarget_rule, validate_rule_references,
    replace_marked, render_dns_section, sync_group_icons, sync_group_test_url,
    sync_node_matching, sync_matching_helpers,
)


def provider(behavior="domain", **fields):
    return {
        "type": "http", "behavior": behavior, "format": "mrs", "interval": 86400,
        "url": "https://cdn.example.com/geo/geosite/sample.mrs",
        "path": "./ruleset/sample.mrs", **fields,
    }


def snapshot(services=None, base=None, **fields):
    return {
        "services": services or [], "baseRuleProviders": base or {},
        "prefixRules": [], "fallbackRules": [], "customServices": {},
        "customProviders": {}, **fields,
    }


class BuilderTests(unittest.TestCase):
    def test_fork_source_tracks_native_history(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "Script").mkdir()
            source_path = root / "Script" / "mihomoScript.js"
            source_path.write_text("const value = 1;\n", encoding="utf-8")
            manifest = {"upstream": {"path": "Script/mihomoScript.js"}}
            outputs = ["a" * 40, "b" * 40, "const value = 1;\n"]
            with patch("build_mihomo_script.ROOT", root), patch(
                "build_mihomo_script.subprocess.check_output", side_effect=outputs,
            ):
                self.assertEqual(
                    resolve_fork_upstream(manifest),
                    ("b" * 40, "a" * 40, "const value = 1;\n"),
                )
            source_path.write_text("const value = 2;\n", encoding="utf-8")
            with patch("build_mihomo_script.ROOT", root), patch(
                "build_mihomo_script.subprocess.check_output", side_effect=outputs,
            ), self.assertRaisesRegex(BuildError, "must match the merged upstream"):
                resolve_fork_upstream(manifest)

    def test_current_service_and_provider_names_flow_through(self):
        data = snapshot(services=[{
            "name": "Renamed Service",
            "providers": {"renamed_ranges": provider("ipcidr")},
            "rules": [
                "RULE-SET,renamed_ranges,Renamed Service,no-resolve",
                "DOMAIN,service.example.com,Renamed Service",
                "PROCESS-NAME,service,Renamed Service",
            ],
        }], base={"new_base": provider()})
        base, services, order = select_upstream_definitions(data, {})
        self.assertEqual(list(base), ["new_base"])
        self.assertEqual(list(services), order)
        blocks, plan = render_service_rule_blocks(services, data, {})
        self.assertEqual(blocks["before_direct"], [])
        self.assertEqual(blocks["after_direct"], [
            "RULE-SET,renamed_ranges,Proxy,no-resolve",
            "DOMAIN,service.example.com,Proxy",
            "PROCESS-NAME,service,Proxy",
        ])
        self.assertEqual(plan[0]["name"], "Renamed Service")

    def test_service_types_and_rule_dependencies_use_actual_definitions(self):
        data = snapshot(services=[{
            "name": "Flexible", "providers": {
                "ranges": provider("ipcidr"),
                "dns_ip": provider("domain", format="text"),
                "file_rules": {"type": "file", "behavior": "classical", "path": "./local.yaml"},
                "inline_rules": {"type": "inline", "behavior": "domain", "payload": ["*.example.com"]},
                "unused_helper": provider(),
            },
            "rules": [
                "AND,((RULE-SET,ranges),(NETWORK,UDP)),Flexible",
                "DOMAIN,example.com,Flexible",
            ],
        }])
        _, services, _ = select_upstream_definitions(data, {})
        self.assertEqual(services["Flexible"]["providers"], data["services"][0]["providers"])
        data["services"][0]["rules"].append("OR,((RULE-SET,missing),(NETWORK,TCP)),Flexible")
        with self.assertRaisesRegex(BuildError, "missing provider missing"):
            select_upstream_definitions(data, {})

    def test_explicit_exclusions_and_new_base_providers(self):
        data = snapshot(services=[
            {"name": "FCM", "providers": {"googlefcm": provider()}, "rules": ["RULE-SET,googlefcm,FCM"]},
            {"name": "New", "providers": {}, "rules": ["DOMAIN,new.example.com,New"]},
            {"name": "Manual", "providers": {}, "rules": []},
        ], base={"epicgames": provider(), "new_base": provider()})
        base, services, _ = select_upstream_definitions(data, {
            "excluded_services": ["FCM"], "excluded_base_rule_providers": ["epicgames"],
        })
        self.assertEqual(list(base), ["new_base"])
        self.assertEqual(list(services), ["New"])

    def test_real_service_and_provider_conflicts_are_reported(self):
        service = {"name": "A", "providers": {"same": provider()}, "rules": ["RULE-SET,same,A"]}
        for data, message in [
            (snapshot(services=[service, service]), "Duplicate upstream service"),
            (snapshot(services=[service], customServices={"A": service}), "service name conflict"),
            (snapshot(services=[service], base={"same": provider(url="https://other.example.com/rules")}), "Provider name conflict"),
            (snapshot(services=[service], customProviders={"same": provider(format="text")}), "Custom provider name conflict"),
        ]:
            with self.subTest(message=message), self.assertRaisesRegex(BuildError, message):
                select_upstream_definitions(data, {})
        # Identical shared definitions remain usable across services.
        select_upstream_definitions(snapshot(services=[
            service, {**service, "name": "B"},
        ]), {})

    def test_custom_urls_and_explicit_replacement_keep_other_upstream_fields(self):
        source = provider(
            url="http://new-cdn.example/geo/geosite/category-games@cn.mrs",
            path="./ruleset/category-games@cn.mrs",
            **{"path-in-bundle": "geo/geosite/category-games@cn.mrs", "interval": 123},
        )
        data = snapshot(services=[{
            "name": "AI", "providers": {"ai": {**provider(), "path-in-bundle": "old.mrs"}},
            "rules": ["RULE-SET,ai,AI"],
        }], base={"games_cn": source, "geolocation-cn": {**provider(), "path-in-bundle": "old.mrs"}})
        base, services, _ = select_upstream_definitions(data, {
            "base_rule_provider_replacements": {
                "games_cn": {"name": "steam_cn", "from": "category-games@cn", "to": "steam@cn"},
            },
            "base_rule_provider_url_overrides": {"geolocation-cn": "https://custom.example/geo.mrs"},
            "service_provider_url_overrides": {"AI": {"ai": "https://custom.example/ai.mrs"}},
        })
        self.assertEqual(base["steam_cn"]["url"], "http://new-cdn.example/geo/geosite/steam@cn.mrs")
        self.assertEqual(base["steam_cn"]["interval"], 123)
        self.assertEqual(base["steam_cn"]["path-in-bundle"], "geo/geosite/steam@cn.mrs")
        self.assertEqual(base["geolocation-cn"]["url"], "https://custom.example/geo.mrs")
        self.assertNotIn("path-in-bundle", base["geolocation-cn"])
        self.assertNotIn("path-in-bundle", services["AI"]["providers"]["ai"])
        self.assertEqual(data["baseRuleProviders"]["games_cn"], source)

    def test_optional_routing_preferences_preserve_order_and_default_new_services(self):
        services = {
            "New": {"rules": ["DOMAIN,new.example.com,New"]},
            "Media": {"rules": ["PROCESS-NAME,player,Media"]},
            "AI": {"rules": ["DOMAIN,ai.example.com,AI"]},
        }
        blocks, plan = render_service_rule_blocks(services, snapshot(), {
            "service_routing": {
                "Old Upstream Name": {"target": "AI", "section": "before_direct", "order": 1},
                "AI": {"target": "AI", "section": "before_direct", "order": 20},
                "Media": {"target": "媒体", "section": "before_direct", "order": 30},
            },
        })
        self.assertEqual(blocks, {
            "before_direct": ["DOMAIN,ai.example.com,AI", "PROCESS-NAME,player,媒体"],
            "after_direct": ["DOMAIN,new.example.com,Proxy"],
        })
        self.assertEqual([item["name"] for item in plan], ["AI", "Media", "New"])

    def test_rule_retargeting_preserves_logical_payload_and_flags(self):
        for rule, expected in [
            ("DOMAIN,example.com,Old", "DOMAIN,example.com,Proxy"),
            ("PROCESS-PATH,/Applications/Test.app,Old", "PROCESS-PATH,/Applications/Test.app,Proxy"),
            ("RULE-SET,ranges,Old,no-resolve", "RULE-SET,ranges,Proxy,no-resolve"),
            ("IP-CIDR,1.2.3.0/24,Old,src,no-resolve", "IP-CIDR,1.2.3.0/24,Proxy,src,no-resolve"),
            ("AND,((RULE-SET,ranges),(NOT,((NETWORK,TCP)))),Old", "AND,((RULE-SET,ranges),(NOT,((NETWORK,TCP)))),Proxy"),
            ("MATCH,Old", "MATCH,Proxy"),
        ]:
            with self.subTest(rule=rule):
                self.assertEqual(retarget_rule(rule, "Proxy"), expected)
                validate_rule_references(expected, {"ranges": provider("ipcidr")})
        with self.assertRaisesRegex(BuildError, "missing its policy"):
            retarget_rule("DOMAIN,example.com", "Proxy")

    def test_base_rules_keep_source_order_with_explicit_local_placement(self):
        data = snapshot(base={"private": provider(), "private_ip": provider("ipcidr"), "games_cn": provider()},
            prefixRules=[
                "DOMAIN,cdn.example.com,直连", "RULE-SET,private,直连",
                "RULE-SET,games_cn,直连", "DOMAIN,excluded.example.com,直连",
                "DOMAIN,new.example.com,直连", "DOMAIN,new.example.com,直连",
            ],
            fallbackRules=["RULE-SET,private_ip,直连", "RULE-SET,new_fallback,默认代理", "MATCH,漏网之鱼"])
        actual = select_prefix_rules(data, {
            "upstream_prefix_rules": {"excluded_rules": ["DOMAIN,excluded.example.com,直连"]},
            "base_rule_provider_replacements": {"games_cn": {"name": "steam_cn"}},
            "base_rule_routing": {
                "private": {"section": "private", "order": 10},
                "private_ip": {"section": "private", "order": 20, "no_resolve": True},
            },
        })
        self.assertEqual(actual, {
            "bootstrap": ["DOMAIN,cdn.example.com,Direct"],
            "private": ["RULE-SET,private,Direct", "RULE-SET,private_ip,Direct,no-resolve"],
            "direct": ["RULE-SET,steam_cn,Direct", "DOMAIN,new.example.com,Direct"],
            "fallback": ["RULE-SET,new_fallback,Proxy"],
        })

    def test_optional_icons_and_test_url_copy_exact_upstream_values(self):
        template = "// BEGIN GENERATED: GROUP_ICONS\n// END GENERATED: GROUP_ICONS\nfunction buildProxyGroups() {}"
        actual, icons = sync_group_icons(template, {"icons": {"A": "http://cdn.example/icon.png?v=2"}}, {
            "group_icon_sources": {"Local A": "A", "Local B": "Removed"},
        })
        self.assertEqual(icons, {"Local A": "http://cdn.example/icon.png?v=2"})
        self.assertIn('"Local A": "http://cdn.example/icon.png?v=2"', actual)
        self.assertEqual(sync_group_icons(actual, {"icons": {"A": icons["Local A"]}}, {
            "group_icon_sources": {"Local A": "A"},
        })[0], actual)
        actual, url = sync_group_test_url(template, {"groupTestUrl": "http://test.example/check?x=1"})
        self.assertEqual(url, "http://test.example/check?x=1")
        actual, url = sync_group_test_url(actual, {})
        self.assertIsNone(url)
        self.assertIn("const groupTestUrl = null;", actual)

    def test_dns_copy_removes_fcm_and_keeps_requested_dns_and_hosts(self):
        upstream = (ROOT / "Script" / "mihomoScript.js").read_text(encoding="utf-8")
        rendered = render_dns_section(upstream, ["+.real.example.com"])
        self.assertNotIn("googlefcm", rendered)
        self.assertNotIn("minimalModeEnabled", rendered)
        self.assertIn("...repczRealIpDomains,", rendered)
        self.assertIn("'rule-set:cn': ['system']", rendered)
        self.assertIn("'direct-nameserver': ['system']", rendered)
        self.assertIn("'services.googleapis.cn': 'services.googleapis.com'", rendered)
        self.assertIn("#Proxy", rendered)
        for host in ("+.mcdn.bilivideo.com", "+.mcdn.bilivideo.cn", "+.edge.mountaintoys.cn", "+.h2.smtcdns.net"):
            self.assertNotIn(host, rendered)

    def test_matching_updates_follow_available_upstream_definitions(self):
        template = """const excludeFilter = /old/i;
const regionDefinitions = [
  { name: '香港', regex: /old/i, },
  { name: '台湾省', regex: /local-taiwan/i, },
];
const rateRegionDefinitions = [
  { name: lowRateRegionName, regex: /local-rate/i, },
];
"""
        contracts = {"excludeFilter": "/new/iu", "regionDefinitions": [
            {"name": "香港", "regex": "/new-hk/i"}, {"name": "台湾", "regex": "/upstream-tw/i"},
        ], "rateRegionDefinitions": []}
        actual = sync_node_matching(template, contracts)
        self.assertIn("/new-hk/i", actual)
        self.assertIn("/local-taiwan/i", actual)
        self.assertIn("/local-rate/i", actual)
        self.assertEqual(sync_node_matching(actual, contracts), actual)

    def test_current_matching_function_source_is_copied_without_hash_lock(self):
        template = """const regionMatchCache = new Map();
function getMatchedRegions(proxyName) {
  return [];
}
"""
        contracts = {"invisibleCharsRegex": r"/[\u200B]/g", "functions": {
            "toMatchableName": """function toMatchableName(name) {
  // New upstream formatting and implementation.
  return String(name).replace(invisibleCharsRegex, '');
}""",
            "getMatchedRegions": """function getMatchedRegions(proxyName) {
  return [toMatchableName(proxyName)];
}""",
        }}
        actual = sync_matching_helpers(template, contracts)
        self.assertIn(contracts["functions"]["toMatchableName"], actual)
        self.assertIn(contracts["functions"]["getMatchedRegions"], actual)
        self.assertEqual(sync_matching_helpers(actual, contracts), actual)

    def test_real_ip_domains_parse_only_the_requested_yaml_sequence(self):
        source = """dns:
  other: true
real_ip_domains:
  - '*.Example.COM'
  - "time.*.example.com" # comment
  - '*.example.com'
  - '*-update.xoyocdn.com'
  - '*-appboot.netflix.com'
other:
  - excluded.example.com
"""
        parsed = extract_real_ip_domains(source)
        self.assertEqual(parsed, [
            "*.example.com", "time.*.example.com", "*-update.xoyocdn.com", "*-appboot.netflix.com",
        ])
        self.assertEqual(select_real_ip_domains(parsed), (
            ["*.example.com", "time.*.example.com"],
            ["*-update.xoyocdn.com", "*-appboot.netflix.com"],
        ))
        with self.assertRaisesRegex(BuildError, "wildcard placement"):
            select_real_ip_domains(["bad*.example.com"])

    def test_ambiguous_yaml_and_generated_markers_report_actionable_errors(self):
        with self.assertRaisesRegex(BuildError, "exactly one top-level"):
            extract_real_ip_domains("real_ip_domains:\n - a.example.com\nreal_ip_domains:\n - b.example.com")
        with self.assertRaisesRegex(BuildError, "missing or duplicated"):
            replace_marked("start\nstart\nend", "start", "end", "new")


if __name__ == "__main__":
    unittest.main()
