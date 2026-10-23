# Mihomo script

A customized Fork of [AIsouler/MyClash](https://github.com/AIsouler/MyClash).
The Git history retains upstream commits; the published override retains the
existing policy groups, DNS behavior, provider overrides, and rule order.

## Subscription

```text
https://raw.githubusercontent.com/frostmage1250/mihomo-script/main/mihomoScript.js
```

## Repository layout

- `upstream` branch: an exact mirror of the full upstream `main` branch.
- `main` branch: the complete upstream Mihomo source, the custom publishing layer,
  required tests, license, and generated subscription.
- `legacy` branch: the previous independent repository's complete published history,
  retained for existing commit-pinned consumers and recovery.
- `Script/mihomoScript.js`: the complete upstream source, byte-for-byte.
- `custom/build_mihomo_script.py`: applies the retained customization boundary.
- `custom/customizations.json`: retained services, explicit replacements and exclusions.
- `custom/upstream.json`: full upstream commit, source digest, secondary DNS source,
  provider definitions, direct-rule provenance, and output digest.
- `mihomoScript.js`: the standalone subscription artifact.
- `tests/`: builder, routing, provider, DNS, and behavior checks.

## Upstream synchronization

Every six hours, on relevant pushes, or on manual dispatch, the workflow fetches
the full upstream Git history and records a native merge into `main`.
The `upstream` branch advances to the exact upstream tip. The complete Mihomo
source and LICENSE are restored from that commit before customization and validation.

The published branch intentionally omits YAML configuration variants, the alternate
script, icon and screenshot assets, DownloadApps examples, upstream test tooling,
format-only automation, and the upstream agent reference document. Their original
files and history remain available on `upstream`. The merge uses the `ours`
strategy for the publishing tree, then explicitly restores the complete retained
source and license; this keeps excluded assets from returning during later merges.

The publishing layer continues to apply the existing reviewed customization scope.
Upstream regexes, DNS/hosts source, TUN stack, retained provider/service definitions,
and selected direct prefix rules flow into the generated artifact. Reviewed structural
changes stop publication for review. The Fork relationship provides full commit
tracking; output behavior remains governed by the customization policy.

## Retained behavior

- Preserve original node names, remove exact duplicate names and dialer-proxy fields.
- Keep the current region, subscription, media, AI, Claude, GitHub, and Final groups.
- Keep the local Taiwan matching definition and existing group choices.
- Use system DNS for mainland-domain and Direct re-resolution; preserve private DNS handling.
- Import compatible real-IP domains from [Repcz/Tool](https://github.com/Repcz/Tool/blob/X/Egern/Egern.yaml).
- Retain the AI, Apple, geolocation-cn, Claude, pron, and MCDN converter sources.
- Use current upstream service and provider names directly; the retained service selection uses Meta.
- Keep Steam CN, NVIDIA CN, Apple CN, and Microsoft CN direct exceptions.
- Place CDN, private-domain, private-IP, and MCDN rules at the start of the direct-exception block after media rules.
- Restore the upstream Google service hosts mapping.
- Follow upstream SVG icon URLs and names for groups with upstream equivalents.
- Keep the repository-specific Claude, media, and pron groups without icons.
- Follow the upstream group test URL for manual latency tests; keep every group as select with interval 0.
- Keep the ctaiot.com direct suffix and the current service/fallback ordering.
- Explicitly exclude Epic Games and preserve the existing fsend.cn exclusion.
- Preserve MCDN REJECT precedence and the selected upstream domain/IP pairs.

## Validation and publication

The workflow runs Python tests, JavaScript syntax and behavior checks, a configuration
check with the latest stable Mihomo, source provenance checks, and deterministic
regeneration. It publishes the merged branch and the upstream mirror together only
after all checks pass. Failed runs leave the published branches at their previous state.

Upstream attribution and the MIT license are retained.
