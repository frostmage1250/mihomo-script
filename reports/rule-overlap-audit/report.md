# Rule overlap audit

- Proposed order is a review draft; main rules were not changed.
- Sources are fixed to commits listed below.

- script: `frostmage1250/mihomo-script@157951215f927afc74068486dac7f904dbbc9935`
- converter: `frostmage1250/proxy-rules-converter@aeb22a124d457c71caa143658738ff0fc1c2069c`
- bett: `appshubcc/bett-rules@3ab11685d346c28709e29d7f650f9e9a59ede6b2`

## Domain overlaps with different policies

| Earlier | Later | Source-literal pairs | Structural pairs | Example |
|---|---|---:|---:|---|
| mcdn | claude | 0 | 105 | `audit-datadog.mcdn.bilivideo.com` |
| private | claude | 0 | 354 | `audit-datadog.tendawifi.com` |
| claude | ai | 4 | 485 | `browser-intake-datadoghq.com` |
| claude | github | 0 | 96 | `audit-datadog.atom.io` |
| ai | github | 9 | 1 | `copilot-proxy.githubusercontent.com` |
| claude | telegram | 0 | 63 | `audit-datadog.cdn-telegram.org` |
| claude | youtube | 0 | 531 | `audit-datadog.youtube` |
| claude | apple-tvplus | 0 | 3 | `audit-datadog.tv.apple.com` |
| claude | meta | 0 | 1665 | `audit-datadog.atmeta.com` |
| ai | meta | 0 | 3 | `meta.ai` |
| claude | twitter | 0 | 72 | `audit-datadog.twitter.jp` |
| ai | twitter | 0 | 1 | `grok.x.com` |
| claude | twitch | 0 | 24 | `audit-datadog.ext-twitch.tv` |
| claude | tiktok | 0 | 93 | `audit-datadog.bytedapm.com` |
| claude | games_cn | 0 | 99 | `audit-datadog.steamserver.net` |
| claude | apple_cn | 0 | 186 | `audit-datadog.apple.cn` |
| apple-tvplus | apple_cn | 2 | 0 | `np-edge.itunes.apple.com` |
| claude | microsoft_cn | 0 | 417 | `audit-datadog.dynamics.cn` |
| claude | pikpak | 2 | 18 | `o4504926511693824.ingest.sentry.io` |
| claude | ehentai | 0 | 24 | `audit-datadog.e-hentai.org` |
| claude | pron | 0 | 225 | `audit-datadog.javdb.com` |
| claude | steam | 0 | 123 | `audit-datadog.underlords.com` |
| games_cn | steam | 4 | 16 | `alibaba.cdn.steampipe.steamcontent.com` |
| claude | google | 0 | 2517 | `audit-datadog.chrome` |
| ai | google | 26 | 33 | `ai.google.dev` |
| youtube | google | 3 | 179 | `yt3.googleusercontent.com` |
| claude | apple | 0 | 4629 | `audit-datadog.apple` |
| apple-tvplus | apple | 16 | 1 | `apple-tv-plus-press.apple.com` |
| apple_cn | apple | 432 | 62 | `np-edge.itunes.apple.com` |
| claude | microsoft | 0 | 1902 | `audit-datadog.microsoft` |
| ai | microsoft | 15 | 7 | `copilot-proxy.githubusercontent.com` |
| github | microsoft | 61 | 34 | `github-api.arkoselabs.com` |
| games_cn | microsoft | 0 | 1 | `xboxlive.cn` |
| microsoft_cn | microsoft | 101 | 150 | `developer.microsoft.com` |
| private | geolocation_non_cn | 2 | 3 | `local.adguard.org` |
| claude | geolocation_non_cn | 4 | 100154 | `anthropic-com.ghost.io` |
| ai | geolocation_non_cn | 28 | 156 | `ai.google.dev` |
| github | geolocation_non_cn | 32 | 32 | `github-api.arkoselabs.com` |
| telegram | geolocation_non_cn | 0 | 21 | `comments.app` |
| youtube | geolocation_non_cn | 1 | 176 | `yt3.googleusercontent.com` |
| apple-tvplus | geolocation_non_cn | 7 | 1 | `apple-tv-plus-press.apple.com` |
| meta | geolocation_non_cn | 2 | 555 | `fbcdn-a.akamaihd.net` |
| twitter | geolocation_non_cn | 0 | 24 | `twitter.jp` |
| twitch | geolocation_non_cn | 26 | 8 | `d1g1f25tn8m2e6.cloudfront.net` |
| tiktok | geolocation_non_cn | 6 | 31 | `roovza-launches.appsflyersdk.com` |
| games_cn | geolocation_non_cn | 1 | 2 | `alibaba.cdn.steampipe.steamcontent.com` |
| apple_cn | geolocation_non_cn | 234 | 0 | `appldnld.g.aaplimg.com` |
| microsoft_cn | geolocation_non_cn | 50 | 9 | `bj1.api.bing.com` |
| pikpak | geolocation_non_cn | 1 | 6 | `o4504926511693824.ingest.sentry.io` |
| ehentai | geolocation_non_cn | 0 | 8 | `e-hentai.org` |
| pron | geolocation_non_cn | 1 | 75 | `widgets.stripst.com` |
| google | geolocation_non_cn | 235 | 820 | `scholar.google.com.ar` |
| mcdn | geolocation_cn | 0 | 26 | `mcdn.bilivideo.cn` |
| claude | geolocation_cn | 0 | 23358 | `audit-datadog.0033.cn` |
| steam | geolocation_cn | 0 | 4 | `steampowered.com.8686c.com` |
| geolocation_non_cn | geolocation_cn | 8 | 175 | `licdn.cn.cdn20.com` |

## Selected domain routing

| Host | Current | Proposed |
|---|---|---|
| `vod-ap-aoc.tv.apple.com` | apple / Proxy | apple-tvplus / 媒体 |
| `tv.apple.com` | apple / Proxy | apple-tvplus / 媒体 |
| `np-edge.itunes.apple.com` | apple_cn / Direct | apple-tvplus / 媒体 |
| `play-edge.itunes.apple.com` | apple_cn / Direct | apple-tvplus / 媒体 |
| `uts-api.itunes.apple.com` | apple / Proxy | apple-tvplus / 媒体 |
| `hls.itunes.apple.com` | apple / Proxy | apple-tvplus / 媒体 |
| `hls-amt.itunes.apple.com` | apple / Proxy | apple-tvplus / 媒体 |
| `tv.applemusic.com` | apple / Proxy | apple-tvplus / 媒体 |
| `apple-relay.apple.com` | apple / Proxy | apple / Proxy |
| `apple-relay.cloudflare.com` | geolocation_non_cn / Proxy | geolocation_non_cn / Proxy |
| `apple-relay.fastly-edge.com` | geolocation_non_cn / Proxy | geolocation_non_cn / Proxy |
| `gspe1-ssl.ls.apple.com` | apple / Proxy | apple / Proxy |
| `github.com` | github / GitHub | github / GitHub |
| `api.github.com` | github / GitHub | github / GitHub |
| `copilot.microsoft.com` | ai / AI | ai / AI |
| `www.youtube.com` | youtube / YouTube | youtube / YouTube |
| `youtubei.googleapis.com` | youtube / YouTube | youtube / YouTube |
| `www.twitch.tv` | twitch / 媒体 | twitch / 媒体 |
| `gql.twitch.tv` | twitch / 媒体 | twitch / 媒体 |
| `www.tiktok.com` | tiktok / 媒体 | tiktok / 媒体 |
| `api.twitter.com` | twitter / 媒体 | twitter / 媒体 |
| `telegram.org` | telegram / Telegram | telegram / Telegram |
| `api.mypikpak.com` | pikpak / PikPak | pikpak / PikPak |
| `mypikpak.com` | pikpak / PikPak | pikpak / PikPak |
| `store.steampowered.com` | steam / Proxy | steam / Proxy |
| `cdn.akamai.steamstatic.com` | steam / Proxy | steam / Proxy |
| `claude.ai` | claude / Claude | claude / Claude |
| `chatgpt.com` | ai / AI | ai / AI |
| `openai.com` | ai / AI | ai / AI |
| `api.statsig.com` | MATCH / Final | MATCH / Final |
| `sentry.io` | claude / Claude | claude / Claude |
| `browser-intake-us5-datadoghq.com` | claude / Claude | claude / Claude |

## IP overlaps with different policies

| Earlier | Later | Collapsed range pairs | Example |
|---|---|---:|---|
| claude | google_ip | 2 | `160.79.106.0` |
| google_ip | microsoft_ip | 1 | `2a14:67c2:570::` |
| google_ip | cn_ip | 6 | `113.197.104.0` |
| apple_ip | cn_ip | 106 | `17.81.2.0` |
| microsoft_ip | cn_ip | 4 | `66.119.149.0` |

## DNS samples changing a domain result because of an earlier IP rule

- `api.statsig.com` -> `34.128.128.0`: google_ip / Google instead of domain result MATCH / Final

## Limits

- Domain witnesses marked false are structural possibilities, not observed requests or confirmed existing hostnames.
- Keyword matching can overlap shared telemetry and arbitrary domains; these are not interpreted as service ownership.
- DNS samples were resolved on a GitHub-hosted runner and may differ from the user's DNS/CDN region.
- IP route samples assume the destination IP is already available; no-resolve may skip an IP rule when it is not.
- ASN-vs-CIDR and ASN runtime ownership were not evaluated.
- Future Apple AI and Egern-only Private Relay are supplemental, not enabled in the proposed Mihomo order.
- A static overlap is not automatically an error; desired policy determines intentional precedence.

## Unsupported rules

[]
