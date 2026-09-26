from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from build_mihomo_script import (  # noqa: E402
    BuildError,
    detect_service_renames,
    extract_real_ip_domains,
    select_real_ip_domains,
    replace_marked,
    render_dns_section,
    render_script,
    select_upstream_definitions,
)


class BuilderTests(unittest.TestCase):
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
        self.assertNotIn("services.googleapis.cn", rendered)
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
