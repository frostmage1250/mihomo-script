# Mihomo script

A customized Fork of [AIsouler/MyClash](https://github.com/AIsouler/MyClash).
The subscription remains:
```text
https://raw.githubusercontent.com/frostmage1250/mihomo-script/main/mihomoScript.js
```

The publishing tree retains the complete upstream script and license. The upstream
branch mirrors upstream main; legacy retains the former repository history.

## Source and output

- Script/mihomoScript.js: complete upstream source, restored from a native Git merge.
- custom/runtime.js: local subscription filtering and functional policy choices.
- custom/customizations.json: explicit source overrides, routing, exclusions, and retained global differences.
- custom/lib/ast.mjs: AST extraction, dependencies, and structured DNS/global changes.
- custom/lib/rules.mjs: rule placement, policy mapping, reference checks, and coverage.
- custom/snapshot.mjs: captures upstream and Repcz commits once per workflow.
- custom/build_mihomo_script.mjs: builds from the captured sources.
- mihomoScript.js: generated standalone subscription output.
- custom/sources.lock.json: immutable input commits, file digests, dependency lock and validation versions.
- custom/upstream.json: source coverage, applied policies, retired customization keys, and output digest.

The generator builds exclusively from independent sources. Acceptance checks use
the pinned upstream input, the explicit customization policy, and the generated
configuration. Repcz domain coverage is checked directly against its pinned YAML.

## Retained policy

The AI, Apple merge, geolocation-cn, Claude, pron, and MCDN converter sources
remain explicit. AI retains Bett's base rules with the converter's supplements.
Twitch and AppleTV remain additional Bett definitions. Their existing URLs remain
declared in the customization policy.

Existing functional group choices, direct exceptions, Steam CN replacement,
service exclusions, original node names, exact-name deduplication, dialer-proxy
removal, system DNS behavior, and routing block order remain in the source policy.
Built-in service rule actions stay intact while group targets are mapped.
Upstream names, ordinary provider fields, icons, and the complete region list
follow upstream. The selected low-rate group remains the existing local choice.

The retained global differences are allow-lan=false, log-level=warning, and
omission of bind-address, NTP, and tun.auto-redirect. Other ordinary global fields
are inherited structurally from upstream. FCM and its optional DNS filter remain
excluded. Repcz parsing uses the standard YAML parser and explicit compatibility
checks without a domain-count ceiling.

## Bettbox compatibility

Build tools use Node.js 22 exclusively in GitHub Actions. The generated subscription
contains no Node imports. One normal subscription fixture is passed directly to
rquickjs/core/sys 0.12.2, matching the dependency lock of Bettbox v1.19.7.
The runner uses the client's 128 MiB memory, 512 KiB stack, and 10-second execution
limits, read from custom/customizations.json. The engine version comes from the
locked Cargo dependency graph. Its generated configuration is checked against
upstream coverage and the retained policy, then passed directly to Mihomo.
The engine executes the final script once. Cargo build artifacts are cached by
the dependency lock and runner source.

Reference: https://github.com/appshubcc/Bettbox/tree/v1.19.7/plugins/code_forge/rust

## Fixed-input publication

Every six hours, on relevant pushes, or by manual dispatch, the workflow merges
upstream history, restores the full source, installs locked build dependencies,
pins the Mihomo validation release, and captures upstream/Repcz inputs once.
Generation and acceptance share that snapshot. The workflow generates the script
once, runs the focused builder unit tests, executes the final script once with
the Bettbox engine, and validates that configuration with Mihomo. Acceptance
checks use the captured inputs throughout. Dependency installation uses committed
locks.
The validated output, source lock, compact report, and upstream mirror are
published atomically.

The report uses schema version 3. It links to custom/sources.lock.json for source
and validation versions, and records rule blocks, coverage, effective icons,
real-IP domain selections, and stale preferences. Full upstream definitions stay
in Script/mihomoScript.js; source provenance stays in the source lock.

Upstream attribution and the MIT license are retained.
