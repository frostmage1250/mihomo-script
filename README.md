# Mihomo override script

This repository publishes a self-contained Mihomo/Bettbox override generated from
[`AIsouler/MyClash`](https://github.com/AIsouler/MyClash/blob/main/Script/mihomoScript.js).
Its real-IP DNS exceptions follow [`Repcz/Tool` Egern YAML](https://github.com/Repcz/Tool/blob/X/Egern/Egern.yaml),
with two explicitly excluded patterns.
The generated script does not fetch upstream code at runtime.

## Subscription

```text
https://raw.githubusercontent.com/frostmage1250/mihomo-script/main/mihomoScript.js
```

## Build boundary

- `config/mihomo-script-customizations.json` is the reviewed structured patch.
- `src/build_mihomo_script.py` resolves the newest upstream commit, downloads that
  immutable revision, extracts selected rule providers and service rules, validates
  the reviewed upstream contract, synchronizes the upstream DNS/hosts section and
  TUN stack, extracts Repcz's `real_ip_domains` from its newest commit, and regenerates
  `mihomoScript.js`.
- `mihomoScript.js` is the standalone generated subscription artifact.
- `reports/mihomo-script-upstream.json` records both upstream commits, the extracted
  Repcz domains, applied domains, excluded domains, and the output digest.

For every retained service, internally consistent provider additions/removals, rule
additions/removals, and provider URL/path updates are accepted automatically. The
generated script is still rejected before publication when a retained service
disappears or is renamed, a provider becomes invalid, rules and providers no longer
reference each other exactly, a reserved Bett provider name collides, or a reviewed
node-filtering, DNS, or region-classification contract changes.

## Local customizations

- Preserve original airport node names and deduplicate exact names only.
- Add `disable-ipv6=true` to every node DNS address in
  `proxy-server-nameserver` and `proxy-server-nameserver-policy`, including airport
  private DNS. This centrally filters AAAA responses without adding per-node
  `ip-version` fields. Ordinary-domain DNS, bootstrap DNS, global IPv6,
  subscription-provided node options, and upstream Hosts rewriting stay unchanged.
- Remove Hong Kong nodes and every airport-provided `dialer-proxy`.
- Keep Taiwan, Singapore, Japan, United States, Other, and low-rate groups.
- Maintain the Taiwan region definition and its original matching regex locally in
  `mihomoScript.js`, independently of upstream removal or changes. Taiwan remains
  available in `Proxy`, `AI`, and `Claude`; the other reviewed upstream region
  contracts remain enforced. Behavioral validation checks Taiwan name variants,
  region grouping, and retention of Taiwan nodes with exclusion keywords.
- Add a fully expanded `订阅` group and place it first in `Proxy`.
- Keep only `DIRECT`, `IPv4优先`, and `IPv6优先` in `Direct`.
- Remove custom-node, chain-proxy, high-rate, foreign-QUIC, FCM, icon, health-check,
  NTP, LAN exposure, and custom `GLOBAL` functionality.
- Use system DNS for `rule-set:cn` and Direct re-resolution; use upstream China DoH
  only for proxy-server and bootstrap resolution.
- Add Mihomo-compatible Repcz `real_ip_domains` directly to the native Fake IP
  filter. Omit `*-update.xoyocdn.com` and `*-appboot.netflix.com`; their
  partial-label wildcard syntax would require regex. If Repcz adds another
  unsupported pattern, the build stops for review instead of broadening it.
- Preserve upstream domain/IP pairs for selected services and the Apple/Microsoft CN
  layering. Add Twitch from Bett rules; rely on the retained Meta domain/IP pair
  because it fully covers the redundant Facebook and Threads domain sets.
- Add a dedicated Claude policy group and load the converter repository's classical
  Claude provider, including authentication, telemetry, risk-control keywords,
  IPv4, IPv6, and AS399358 coverage while excluding NTP. Match Claude before the
  generic AI rule.
- Add a dedicated GitHub policy group with `Proxy`, `订阅`, and `AI` choices,
  and route the retained GitHub rules to it.
- Route the retained AI service through the converter repository's extended Bett
  `ai.mrs` and remove its obsolete Bett bundle path. Override the
  `geolocation-cn` provider URL with the reviewed converter output.

## Automation and validation

The workflow runs every six hours (01:00, 07:00, 13:00, and 19:00 Asia/Shanghai),
on relevant pushes, and on manual dispatch. Safe changes are
committed directly to `main`; unchanged output creates no commit. It downloads the
latest stable Mihomo binary and verifies its published SHA-256 digest, then runs:

1. Python builder tests.
2. JavaScript syntax and synthetic airport-profile tests.
3. Rule/provider and policy-group invariant checks.
4. A complete Mihomo core configuration check.
5. Deterministic regeneration and whitespace validation.

If either upstream cannot be fetched or parsed, the workflow does not publish a new
script. Changes to Repcz's list are incorporated on the next successful scheduled run.
Configure GitHub Actions notifications for failed workflows to receive email only when manual review is needed.

Upstream DNS/hosts changes are accepted automatically, including new DNS routing,
public-DNS matching, and hosts entries. The generated output always overrides mainland
domain resolution (`rule-set:cn`) and direct resolution (`direct-nameserver`) to use
only `system`; the local proxy group name and intentionally removed FCM rule remain
preserved. The `services.googleapis.cn` rewrite and Bilibili PCDN blocking hosts are
permanently excluded even if upstream adds them again.

## MCDN blocking

The script references **mcdn屏蔽** from the rule converter's
`dist/mihomo/mcdn-block.mrs` as an HTTP provider with domain behavior and MRS
format. Its REJECT rule is first, before general service and China DIRECT
rules. The four reviewed suffixes include their apex and all subdomains:
`mcdn.bilivideo.com`, `mcdn.bilivideo.cn`, `edge.mountaintoys.cn`, and
`h2.smtcdns.net`. This is connection routing; no DNS Hosts block or HTTPS
rewrite is added.
