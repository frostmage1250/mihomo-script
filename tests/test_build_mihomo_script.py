from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from build_mihomo_script import (  # noqa: E402
    BuildError,
    replace_marked,
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
"""
        sha = "1" * 40
        first = render_script(template, sha, {"a": {"x": 1}}, {"S": {"providers": {}, "rules": []}})
        second = render_script(first, sha, {"a": {"x": 1}}, {"S": {"providers": {}, "rules": []}})
        self.assertEqual(first, second)
        self.assertIn(f"上游提交：{sha}", first)

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

        _base, services = select_upstream_definitions(extracted, manifest)

        self.assertEqual(list(services["Service"]["providers"]), ["service", "service_ip"])


if __name__ == "__main__":
    unittest.main()


