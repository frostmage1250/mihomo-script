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
rename nodes or groups, rewrite service targets, or override global
settings or ordinary providers. Hosts changes are limited to the MCDN exclusions below. The explicit option defaults, group testing-field cleanup
and two DNS overrides plus the hosts exclusions below are applied in addition to the retained rule additions and placements.

## Complete customization list

Two DNS fields are fixed by `dns_overrides` in custom/customizations.json:

- `nameserver-policy["rule-set:cn"]`: `["system"]` for domestic domains.
- `direct-nameserver`: `["system"]` for direct-exit domain resolution.

The generator reapplies these values on every upstream synchronization and fails
if the upstream DNS construction or target fields change. The existing
`direct-nameserver-follow-policy` behavior and all other DNS fields follow
upstream, including the private-domain and Douyin policies, node-domain DNS,
bootstrap DNS and default nameservers.

MCDN hosts exclusions are fixed by `hosts_exclude_suffixes` in the manifest.
Remove source hosts mappings for these suffixes and their subdomains on every
generation, including exact, `+.`, `.` and wildcard forms:

- `mcdn.bilivideo.com` and `*.mcdn.bilivideo.com`
- `mcdn.bilivideo.cn` and `*.mcdn.bilivideo.cn`
- `edge.mountaintoys.cn` and `*.edge.mountaintoys.cn`
- `h2.smtcdns.net` and `*.h2.smtcdns.net`

The upstream currently expresses these eight apex/subdomain scopes as four
`+.` mappings to `0.0.0.0`. Remove those hosts mappings; retain the separate
`RULE-SET,mcdn屏蔽,REJECT` blocking rule. All other hosts follow upstream.

Automatic-selection, load-balance and regional-auto-selection groups retain
their complete upstream implementations and Bettbox switches, defaulting to
false. Saved or manually changed client switches are honored; there is no
runtime force-disable, deleted switch, or rejection of enabled automatic groups.

Only these policy-group latency-test fields are removed:
url, interval, timeout, lazy, max-failed-times, tolerance, expected-status.
Load-balance strategy/hash-key and ordinary group fields follow upstream.
Rule-provider URLs and download intervals are unchanged. Manual tests remain
available. If an automatic group is enabled, Mihomo may run health checks using
its native defaults even though explicit script test fields are absent.

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
FCM and all ordinary services, group names/types/candidates/order/icons, node naming/deduplication/filtering, direct nodes,
DNS apart from the two explicit overrides above, Fake-IP, hosts apart from the explicit MCDN exclusions above, and global fields. Apple CN is only one of the earlier direct
rules: earlier geolocation-cn/private matches retain their upstream priority.
