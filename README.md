# Mihomo script

Upstream: [AIsouler/MyClash](https://github.com/AIsouler/MyClash).

Subscription: [mihomoScript.js](https://raw.githubusercontent.com/frostmage1250/mihomo-script/main/mihomoScript.js).

## Generation

On a relevant push, manual dispatch, or the two-hour schedule, download the latest
upstream main archive once, apply custom/customizations.json once, and publish
mihomoScript.js with the upstream MIT license. The source archive is temporary.
There is no stored upstream mirror, model artifact, local test stage, or build cache.

The generator preserves upstream source outside the specific declarations and
rule insertion points needed by the manifest. It does not rebuild policy groups,
rename nodes or groups, rewrite service targets, or override DNS, hosts, global
settings or ordinary providers. The explicit automatic-testing disable policy
is applied in addition to the retained rule additions and placements.

## Complete customization list

Automatic testing is disabled explicitly (disable_automatic_testing=true):

- Remove the automatic-selection, load-balance and regional-auto-selection switches.
- Remove their saved Bettbox values again at the beginning of main, so cached
  client settings cannot silently restore automatic groups.
- Remove latency-test URL, interval, timeout, lazy, retry/failure threshold,
  tolerance, expected-status, strategy/hash-key and health-check group fields.
- Retain manual UI-triggered latency tests. Rule-provider download intervals
  are ordinary resource updates and remain unchanged.


Five additional providers are retained:

- claude: converter dist/mihomo/claude.yaml; service/group Claude.
- porn: converter dist/mihomo/porn.mrs; service/group porn.
- mcdn屏蔽: converter dist/mihomo/mcdn-block.mrs; action REJECT.
- appletv: Bett geosite/apple-tvplus.mrs; service/group AppleTV.
- apple_podcasts: Bett geosite/apple-podcasts.mrs, inheriting ruleSetBaseUrl;
  service/group Apple Podcasts.

The converter base is https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/.
The four additional services use selectBaseOption and the unmodified upstream
group generator. Their switches are added to ruleOptionsEnable and appear in
Bettbox through the upstream policyGroupOptions declaration.

Only these domain-rule placements are applied:

- AppleTV and Apple Podcasts before RULE-SET,apple_cn.
- Claude before the AI domain rules.
- porn after the EHentai domain rules.

RULE-SET,mcdn屏蔽,REJECT is inserted immediately before the upstream functionalRules
stage, after the prefix and optional QUIC stages. Upstream IP rules retain their
position and flags. Disabled services emit no rules; when a service anchor is
disabled, its dependent service retains its upstream-generated position.

Everything else follows upstream, including geolocation-cn, games_cn, Epic Games,
FCM and all ordinary services, group names/candidates/order/icons (apart from the
removed automatic groups), node naming/deduplication/filtering, direct nodes,
DNS, Fake-IP, hosts, and global fields. Apple CN is only one of the earlier direct
rules: earlier geolocation-cn/private matches retain their upstream priority.
