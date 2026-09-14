# Mihomo override script

This repository publishes a self-contained Mihomo/Bettbox override generated from
[`AIsouler/MyClash`](https://github.com/AIsouler/MyClash/blob/main/Script/mihomoScript.js).
The generated script does not fetch upstream code at runtime.

## Subscription

```text
https://raw.githubusercontent.com/frostmage1250/mihomo-script/main/mihomoScript.js
```

## Build boundary

- `config/mihomo-script-customizations.json` is the reviewed structured patch.
- `src/build_mihomo_script.py` resolves the newest upstream commit, downloads that
  immutable revision, extracts selected rule providers and service rules, validates
  the reviewed upstream contract, synchronizes the upstream DNS/hosts section, and
  regenerates `mihomoScript.js`.
- `mihomoScript.js` is the standalone generated subscription artifact.
- `reports/mihomo-script-upstream.json` records the exact upstream commit and output
  digest.

For every retained service, internally consistent provider additions/removals, rule
additions/removals, and provider URL/path updates are accepted automatically. The
generated script is still rejected before publication when a retained service
disappears or is renamed, a provider becomes invalid, rules and providers no longer
reference each other exactly, a reserved Bett provider name collides, or a reviewed
node-filtering, DNS, or region-classification contract changes.

## Local customizations

- Preserve original airport node names and deduplicate exact names only.
- Remove Hong Kong nodes and every airport-provided `dialer-proxy`.
- Keep Taiwan, Singapore, Japan, United States, Other, and low-rate groups.
- Add a fully expanded `订阅` group and place it first in `Proxy`.
- Keep only `DIRECT`, `IPv4优先`, and `IPv6优先` in `Direct`.
- Remove custom-node, chain-proxy, high-rate, foreign-QUIC, FCM, icon, health-check,
  NTP, LAN exposure, and custom `GLOBAL` functionality.
- Use system DNS for `rule-set:cn` and Direct re-resolution; use upstream China DoH
  only for proxy-server and bootstrap resolution.
- Preserve upstream domain/IP pairs for selected services and the Apple/Microsoft CN
  layering. Add Threads, Facebook/domain+IP, and Twitch from Bett rules.
- Override only the `geolocation-cn` provider URL with the reviewed converter output.

## Automation and validation

The workflow runs daily at 02:37 Asia/Taipei and on manual dispatch. Safe changes are
committed directly to `main`; unchanged output creates no commit. It downloads the
latest stable Mihomo binary and verifies its published SHA-256 digest, then runs:

1. Python builder tests.
2. JavaScript syntax and synthetic airport-profile tests.
3. Rule/provider and policy-group invariant checks.
4. A complete Mihomo core configuration check.
5. Deterministic regeneration and whitespace validation.

Any failure leaves the last working subscription in place. Configure GitHub Actions
notifications for failed workflows to receive email only when manual review is needed.

Upstream DNS/hosts changes are accepted automatically, including new DNS routing,
public-DNS matching, and hosts entries. The generated output always overrides mainland
domain resolution (`rule-set:cn`) and direct resolution (`direct-nameserver`) to use
only `system`; the local proxy group name and intentionally removed FCM rule remain
preserved.


