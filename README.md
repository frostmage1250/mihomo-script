# Mihomo script

Customized from [AIsouler/MyClash](https://github.com/AIsouler/MyClash).

Subscription:
```text
https://raw.githubusercontent.com/frostmage1250/mihomo-script/main/mihomoScript.js
```

## Generation

On a relevant push, manual dispatch, or the two-hour schedule:

1. Download the latest upstream `main` source archive once.
2. Read its script, then apply `custom/customizations.json` once.
3. Generate and publish `mihomoScript.js`, retaining the upstream MIT license.

The upstream files exist only in a temporary runner directory, which is removed
when the publishing step finishes. No upstream mirror, source snapshot, report,
source lock, test output, or build cache is published. The workflow has no extra
test or validation stages and emits no custom build logs.

The build uses `custom/build_mihomo_script.mjs`, `custom/lib/`,
`custom/runtime.js`, and the customization manifest. The upstream runtime is
retained with the explicit customizations below.

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

The geolocation-cn, Claude, porn, and MCDN converter sources remain explicit.
AI directly uses upstream Bett's category-ai-!cn.mrs without converter supplements.
AppleTV remains an additional Bett definition with its source URL declared in
the customization policy. Twitch's standalone rules and provider are removed.

Existing functional group choices, direct exceptions, Steam CN replacement,
service exclusions, original node names, exact-name deduplication, and system DNS
behavior remain in the source policy. Valid dialer-proxy references are retained
and invalid references are handled by the upstream repair workflow.
Rule order comes directly from the upstream script's `main()` and service list.
The generator does not reconstruct, regroup, or sort upstream routing rules.
Upstream `rules` and `ipRules`, their flags, service switches, and relative order
are retained by the complete upstream runtime. Policy names, provider names,
and explicit exclusions are rewritten in place after upstream generation.
Additional services first enter the native service list in declaration order.
After upstream rule generation and explicit name substitutions, only
\`rule_order_overrides\` from the customization manifest are applied: AppleTV and
Apple Podcasts before Apple's domain rules, Claude before AI's domain rules,
and porn immediately after EHentai. These overrides move only service domain
rules; upstream IP rules retain their original position and flags. If an anchor
service is disabled or absent, the additional rules retain their generated position.
The retained MCDN reject rule is
inserted immediately before the native functional-rule spread without reordering
any upstream rule. The QUIC switch and its default come
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

## Rule data provenance

Ordinary provider data comes from appshubcc/bett-rules on meta. The QUIC-specific
`cn_additional` provider retains its complete upstream definition and source URL.
The four reviewed
converter providers are Claude, geolocation-cn, porn, and MCDN.
AI follows the upstream Bett MRS URL and bundle path.
Bettbox is the execution/compatibility client, while the script's upstream source
is AIsouler/MyClash. Provider customizations follow this boundary.

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
