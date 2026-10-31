# Mihomo script

A customized Fork of [AIsouler/MyClash](https://github.com/AIsouler/MyClash).
The subscription remains:
```text
https://raw.githubusercontent.com/frostmage1250/mihomo-script/main/mihomoScript.js
```

The publishing tree retains the upstream build inputs and license.
The workflow fetches upstream sources for each build without merging their Git
history or maintaining a mirror branch. The legacy branch retains the former
repository history.

## Source and output

- Script/mihomoScript.js: complete upstream source fetched for the build.
- Config/mihomoConfig.yaml: complete upstream YAML supplying routing order.
- custom/runtime.js: local subscription filtering and functional policy choices.
- custom/customizations.json: explicit source overrides, routing, exclusions, and retained global differences.
- custom/lib/ast.mjs: AST extraction, dependencies, and structured DNS/global changes.
- custom/lib/rules.mjs: rule placement, policy mapping, conflict checks, and coverage.
- custom/snapshot.mjs: captures the upstream commit once per workflow.
- custom/build_mihomo_script.mjs: builds from the captured sources.
- mihomoScript.js: generated standalone subscription output.
- custom/sources.lock.json: immutable input commits, file digests, dependency lock and validation versions.
- custom/upstream.json: source coverage, applied policies, retired customization keys, and output digest.

The generator retains the complete runtime from the fixed upstream script.
The upstream entry point performs node filtering, rate/home classification,
custom-node processing, dialer reference repair, proxy IP preference, service
switches, minimal mode, DNS/hosts processing, and ordinary global configuration.
Only the explicit customization manifest is applied around that runtime. Rule
order comes from the fixed upstream YAML. Acceptance checks compare inherited
behavior with the actual upstream entry point; Mihomo validates configuration
syntax and references.

## Retained policy

`policy_group_type: "select"` is an explicit customization: every functional,
regional, subscription, and other generated policy group uses manual selection.
Upstream automatic selection, load balancing, and regional automatic-selection
groups are not generated. Existing group candidates and their order are recorded
in policy_group_candidates and policy_group_order. Group icon choices remain in
group_icon_sources. Dynamic regional, rate and home groups follow upstream.
policy_group_overrides retains interval=0. omitted_policy_group_fields explicitly
removes timeout, lazy, max-failed-times and default-selected from every group.

`preserve_original_proxy_names: true` is an explicit customization: subscription
node names are retained exactly, including whitespace, flags, punctuation and
invisible characters. The same policy applies to custom nodes. Upstream name normalization is not applied: no flag is
added or moved, and whitespace is not trimmed or collapsed. Only completely
identical original names are deduplicated, retaining the first node, including
collisions between subscription and custom nodes. This is recorded as
proxy_name_deduplication=exact-name-first. Temporary name cleanup for matching
does not change the emitted node names.

The AI, geolocation-cn, Claude, porn, and MCDN converter sources
remain explicit. AI retains Bett's base rules with the converter's supplements.
Twitch and AppleTV remain additional Bett definitions. Their existing URLs remain
declared in the customization policy.

Existing functional group choices, direct exceptions, Steam CN replacement,
service exclusions, original node names, exact-name deduplication, and system DNS
behavior remain in the source policy. Valid dialer-proxy references are retained
and invalid references are handled by the upstream repair workflow.
The fixed upstream `Config/mihomoConfig.yaml` supplies routing order.
Its download/private/domestic direct prefix precedes QUIC and MCDN rejection,
then business services follow YAML order, then foreign-domain, domestic-IP,
private-IP and final fallbacks. Extra services use explicit insertion anchors:
Claude before AI, AppleTV and Podcasts before Apple, and Twitch after YouTube.
The YAML and script come from the same upstream commit and are hash-locked. The QUIC switch and its default come
directly from upstream `ruleOptionsEnable.屏蔽国外QUIC`. Setting it to `false`
removes the upstream QUIC reject rules and `cn_additional`; setting it to `true`
restores both. The reject expression and provider definition follow upstream.
Built-in service rule actions stay intact while group targets are mapped.
Upstream names, ordinary provider fields, icons, and the complete region list
follow upstream. Low-rate and high-rate group generation, high-rate filtering,
home groups, proxy IPv4/IPv6 preferences, custom nodes, GLOBAL, minimal mode,
group visibility, and service switches use the upstream implementations and
defaults unless an explicit customization applies. DNS proxy suffixes follow
policy_aliases too: upstream #默认代理 becomes #Proxy, preserving connection
parameters and the built-in #DIRECT target. Compatible_With_Bettbox keeps
the upstream service policy-group metadata.

The retained global differences are allow-lan=false, log-level=warning, and
omission of bind-address, NTP, and tun.auto-redirect. Other ordinary global fields
are inherited structurally from upstream. FCM remains disabled with its excluded
service. Fake-IP mode, address ranges,
and filter expressions follow upstream without Repcz additions or filter overrides.
The upstream conditional FCM filter is preserved and follows that service switch.

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

Every six hours, on relevant pushes, or by manual dispatch, the workflow fetches
upstream sources into the temporary runner, restores the required build inputs,
installs locked build dependencies, pins the Mihomo validation release, and
captures upstream inputs once.
Generation and acceptance share that snapshot. The workflow generates the script
once, executes the final script once with the Bettbox engine, checks upstream
coverage and explicit customizations, and validates the configuration with Mihomo.
Builder unit tests run on pushes that change the builder, runtime, policy, tests,
dependencies, or this workflow. Scheduled and manually dispatched synchronization
runs use the output acceptance checks. Dependency installation uses committed locks.
The validated output, source lock, compact report, and required build inputs are
published to main in one commit. Upstream history is not merged or pushed.

The report uses schema version 3 and runtime_mode=upstream-with-explicit-customizations.
It links to custom/sources.lock.json for source and validation versions, and records
rule blocks, coverage, effective icons,
the upstream Fake-IP mode, and stale preferences. Full upstream definitions stay
in Script/mihomoScript.js; source provenance stays in the source lock.

Upstream attribution and the MIT license are retained.

## Rule data provenance

Ordinary provider data comes from appshubcc/bett-rules on meta. The QUIC-specific
`cn_additional` provider retains its complete upstream definition and source URL.
The five reviewed
converter providers are AI, Claude, geolocation-cn, porn, and MCDN.
Bettbox is the execution/compatibility client, while the script's upstream source
is AIsouler/MyClash. Acceptance validates every provider URL against this boundary.

The porn rule-set uses provider key `porn` and `dist/mihomo/porn.mrs`; its
policy group is `porn`, with choices `Proxy`, `新加坡`, `低倍率节点`, and `美国`.
EHentai choices are `Proxy`, `美国`, `新加坡`, and `香港`, in that order.
Regional choices appear only when matching subscription nodes exist.
Steam CN continues to use Bett `steam@cn`.
The retired 11-rule steam-cn-download provider is not referenced by this script.

Apple uses the upstream Bett `geosite/apple.mrs` definition.
Apple Podcasts uses Bett `geosite/apple-podcasts.mrs` through the upstream
`ruleSetBaseUrl`, so mirror changes flow into both providers automatically.
Its service rule routes to `媒体` after the upstream prefix and QUIC stage, with no independent Podcasts group.
Podcasts uses the default foreign nameservers while proxied. Selecting Direct
uses system DNS through `direct-nameserver`; DNS policy retains the shared
Private, Douyin, and CN entries.
