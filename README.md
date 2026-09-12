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
  the reviewed upstream contract, and regenerates `mihomoScript.js`.
- `mihomoScript.js` is the standalone generated subscription artifact.
- `reports/mihomo-script-upstream.json` records the exact upstream commit and output
  digest.

Selected upstream provider URLs and rule ordering may update automatically. A service
rename, provider-set change, behavior/format change, relevant upstream function
change, missing rule reference, or collision with the reserved Bett additions stops
the build before publication and requires review.

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

