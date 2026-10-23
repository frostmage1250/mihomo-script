#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { isDeepStrictEqual } = require("util");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "mihomoScript.js");
const source = fs.readFileSync(scriptPath, "utf8");
const load = new Function(`${source}\nreturn { main };`);
const { main } = load();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function ss(name, extra = {}) {
  return {
    name,
    type: "ss",
    server: "node.example.com",
    port: 443,
    cipher: "aes-128-gcm",
    password: "fixture-password",
    ...extra,
  };
}

const fixture = {
  proxies: [
    ss("日本 01"),
    ss("日本 01", { server: "duplicate.example.com" }),
    ss("香港 01"),
    ss("新加坡 01"),
    ss("美国 01", { "dialer-proxy": "日本 01" }),
    ss("韩国 01"),
    ss("日本 0.5x"),
    ss("官网 剩余流量"),
  ],
  dns: {},
  hosts: {},
};

const output = main(fixture);
const proxyNames = output.proxies.map((proxy) => proxy.name);
const groups = new Map(output["proxy-groups"].map((group) => [group.name, group]));
const providers = output["rule-providers"];

assert(proxyNames.filter((name) => name === "日本 01").length === 1, "exact duplicate names must keep the first node only");
assert(proxyNames.includes("香港 01"), "Hong Kong nodes must be retained");
assert(!proxyNames.some((name) => name.includes("官网")), "airport information nodes must be removed");
assert(output.proxies.every((proxy) => !("dialer-proxy" in proxy)), "dialer-proxy must be removed from every node");
assert(proxyNames.includes("日本 01") && proxyNames.includes("美国 01") && proxyNames.includes("韩国 01"), "original node names must be preserved");

assert(groups.has("订阅"), "subscription group is missing");
assert(JSON.stringify(groups.get("订阅").proxies) === JSON.stringify(["日本 01", "香港 01", "新加坡 01", "美国 01", "韩国 01", "日本 0.5x"]), "subscription group must expand filtered airport nodes in source order");
assert(
  JSON.stringify(groups.get("Proxy").proxies) === JSON.stringify([
    "订阅", "香港", "新加坡", "日本", "美国", "其他节点", "低倍率节点",
    "日本 01", "香港 01", "新加坡 01", "美国 01", "韩国 01", "日本 0.5x",
  ]),
  "Proxy must retain subscription and regional choices, then expand every filtered subscription node in source order",
);
assert(groups.has("GitHub"), "GitHub policy group is missing");
assert(
  JSON.stringify(groups.get("GitHub").proxies) === JSON.stringify(["Proxy", "订阅", "AI"]),
  "GitHub policy choices must be Proxy, subscription, and AI in order",
);
assert(groups.has("Claude"), "Claude policy group is missing");
assert(groups.has("pron"), "pron policy group is missing");
assert(groups.has("YouTube"), "YouTube policy group is missing");
assert(JSON.stringify(groups.get("YouTube").proxies) === JSON.stringify(["Proxy", "香港", "低倍率节点"]), "YouTube must offer Proxy, Hong Kong, and low-rate choices without expanding subscription nodes");
for (const name of ["媒体", "Telegram"]) {
  assert(JSON.stringify(groups.get(name).proxies) === JSON.stringify(["Proxy", "低倍率节点", "香港"]), `${name} must retain low-rate choices and include Hong Kong`);
}
assert(JSON.stringify(groups.get("PikPak").proxies) === JSON.stringify(["Proxy", "Direct", "低倍率节点", "香港"]), "PikPak must retain Direct and low-rate choices and include Hong Kong");
assert(JSON.stringify(groups.get("pron").proxies) === JSON.stringify(["Proxy", "香港", "新加坡"]), "pron must offer Proxy, Hong Kong, and Singapore groups without expanding subscription nodes");
assert(
  JSON.stringify(groups.get("Claude").proxies) === JSON.stringify(["Proxy", "订阅", ...groups.get("AI").proxies.slice(1)]),
  "Claude policy choices must include subscription after Proxy, followed by the AI regional choices",
);
assert(JSON.stringify(groups.get("Direct").proxies) === JSON.stringify(["DIRECT", "IPv4优先", "IPv6优先"]), "Direct choices changed");
assert(groups.get("其他节点").proxies.includes("韩国 01"), "unrecognized normal regions must enter Other");
assert(groups.get("低倍率节点").proxies.includes("日本 0.5x"), "low-rate node grouping failed");
assert(JSON.stringify(groups.get("香港").proxies) === JSON.stringify(["香港 01"]), "Hong Kong region group must contain its nodes");
assert(groups.get("Proxy").proxies.includes("香港"), "Proxy group must include the Hong Kong region");
assert(!groups.has("GLOBAL") && !groups.has("高倍率节点"), "forbidden groups were generated");

for (const group of groups.values()) {
  assert(group["empty-fallback"] === "REJECT", `empty-fallback missing from ${group.name}`);
  for (const field of ["url", "interval", "timeout", "lazy", "max-failed-times"]) {
    assert(!(field in group), `unexpected ${field} in ${group.name}`);
  }
}


for (const [name, upstreamName] of Object.entries(manifest.group_icon_sources)) {
  const icon = buildReport.upstream_group_icons[upstreamName];
  assert(typeof icon === "string" && icon.endsWith(".svg"), "upstream SVG icon missing for " + name);
  assert(buildReport.applied_group_icons[name] === icon, "icon provenance differs for " + name);
  if (groups.has(name)) assert(groups.get(name).icon === icon, "group icon differs from upstream for " + name);
}
for (const group of groups.values()) {
  assert(typeof group.icon === "string" && group.icon.endsWith(".svg"), "SVG icon missing for " + group.name);
}

assert(Array.isArray(output.dns["proxy-server-nameserver"]) && output.dns["proxy-server-nameserver"].length > 0, "proxy server DNS must follow upstream DNS configuration");
assert(Array.isArray(output.dns["default-nameserver"]) && output.dns["default-nameserver"].length > 0, "default DNS must follow upstream DNS configuration");
assert(JSON.stringify(output.dns["nameserver-policy"]["rule-set:cn"]) === JSON.stringify(["system"]), "CN domains must use system DNS");
assert(output.dns["nameserver-policy"]["rule-set:private"] === "system", "private domains must use system DNS");
assert(
  JSON.stringify(output.dns["nameserver-policy"]["rule-set:douyin"]) === JSON.stringify(["system", "180.184.1.1", "180.184.2.2"]),
  "Douyin DNS policy must follow upstream",
);
assert(output.dns["direct-nameserver-follow-policy"] === true, "direct DNS must follow matching nameserver policy");
for (const key of Object.keys(output.dns["nameserver-policy"])) {
  const match = /^rule-set:(.+)$/.exec(key);
  if (match) assert(match[1] in providers, `DNS policy references missing provider: ${match[1]}`);
}
assert(JSON.stringify(output.dns["direct-nameserver"]) === JSON.stringify(["system"]), "direct traffic must use system DNS");
assert(!output.dns["fake-ip-filter"].includes("rule-set:googlefcm"), "FCM fake-IP rule must not remain");

const buildReport = JSON.parse(fs.readFileSync(path.join(root, "custom", "upstream.json"), "utf8"));

assert(buildReport.fork.source_mode === "native-git-merge", "published provenance must identify the Fork merge workflow");
assert(/^[0-9a-f]{40}$/.test(buildReport.fork.upstream_commit), "full upstream commit must be recorded");
const upstreamSource = fs.readFileSync(path.join(root, "Script", "mihomoScript.js"), "utf8");
assert(require("crypto").createHash("sha256").update(upstreamSource).digest("hex") === buildReport.fork.source_sha256, "source digest must match the complete merged upstream file");

const manifest = JSON.parse(fs.readFileSync(path.join(root, "custom", "customizations.json"), "utf8"));
assert(isDeepStrictEqual(buildReport.service_provider_url_overrides, manifest.service_provider_url_overrides), "custom provider overrides differ from manifest");
const excludedPrefixRules = new Set(manifest.upstream_prefix_rules.excluded_rules);
const prefixProviderNames = buildReport.upstream_prefix_rules
  .filter((rule) => !excludedPrefixRules.has(rule) && rule.startsWith("RULE-SET,"))
  .map((rule) => rule.split(",")[1]);
const expectedBaseNames = [...new Set([...manifest.retained_base_rule_providers, ...prefixProviderNames])];
assert(isDeepStrictEqual(Object.keys(buildReport.upstream_base_rule_providers).sort(), expectedBaseNames.sort()), "upstream base provider snapshot is incomplete");
assert(isDeepStrictEqual(Object.keys(buildReport.upstream_service_rule_providers).sort(), Object.keys(buildReport.retained_services).sort()), "upstream service provider snapshot is incomplete");

// Compare ordinary providers with this build's pinned upstream definitions.
// CDN, URL, path, interval and other field changes follow upstream automatically.
function assertUpstreamProvider(name, upstreamProvider, overrideUrl, removeBundlePath = false) {
  const expected = { ...upstreamProvider };
  if (overrideUrl !== undefined) expected.url = overrideUrl;
  if (removeBundlePath) delete expected["path-in-bundle"];
  assert(isDeepStrictEqual(providers[name], expected), `provider differs from pinned upstream/custom override: ${name}`);
}
assert(isDeepStrictEqual(buildReport.base_rule_provider_replacements, manifest.base_rule_provider_replacements), "base ruleset replacements differ from manifest");
for (const [name, provider] of Object.entries(buildReport.upstream_base_rule_providers)) {
  const replacement = manifest.base_rule_provider_replacements?.[name];
  const expected = { ...provider };
  if (replacement) {
    const oldSuffix = "/" + replacement.from + ".mrs";
    for (const field of ["url", "path", "path-in-bundle"]) {
      if (field === "path-in-bundle" && !(field in expected)) continue;
      assert(expected[field].endsWith(oldSuffix), `upstream replacement source changed: ${name}.${field}`);
      expected[field] = expected[field].slice(0, -oldSuffix.length) + "/" + replacement.to + ".mrs";
    }
  }
  const overrideUrl = name === "geolocation-cn"
    ? "https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/geolocation-cn.mrs"
    : undefined;
  assertUpstreamProvider(replacement?.name || name, expected, overrideUrl);
}
for (const [serviceName, upstreamProviders] of Object.entries(buildReport.upstream_service_rule_providers)) {
  const configuredName = manifest.retained_services.find((name) =>
    name === serviceName || (manifest.retained_service_aliases?.[name] || []).includes(serviceName)
  );
  const overrides = manifest.service_provider_url_overrides?.[configuredName || serviceName] || {};
  assert(isDeepStrictEqual(Object.keys(upstreamProviders).sort(), [...buildReport.retained_services[serviceName].providers].sort()), `upstream provider snapshot is incomplete: ${serviceName}`);
  for (const [name, provider] of Object.entries(upstreamProviders)) {
    assertUpstreamProvider(name, provider, overrides[name], overrides[name] !== undefined);
  }
}

const matching = new Function(
  source + "\nreturn { excludeFilter, regionDefinitions, rateRegionDefinitions, invisibleCharsRegex, toMatchableName, getMatchedRegions, filterProxies, ruleOptionsEnable };"
)();
assert(String(matching.excludeFilter) === buildReport.upstream_matching.excludeFilter, "node exclusion regex must match upstream");
for (const kind of ["regionDefinitions", "rateRegionDefinitions"]) {
  for (const item of buildReport.upstream_matching[kind]) {
    const actual = matching[kind].find((value) => value.name === item.name);
    assert(actual && String(actual.regex) === item.regex, "node matching regex differs from upstream: " + item.name);
  }
}
assert(String(matching.invisibleCharsRegex) === buildReport.upstream_matching.invisibleCharsRegex, "invisible-character regex must match the pinned upstream");
for (const name of ["toMatchableName", "getMatchedRegions"]) {
  assert(String(matching[name]) === buildReport.upstream_matching.functions[name], "matching helper differs from pinned upstream: " + name);
}

const zw = (name) => [...name].join("\u200B");
const invisibleNames = [
  zw("HK 01"), "\u3164SG\uFFA0 03", zw("TW 01"),
  zw("日本 0.3x"), "HK 01", "H\u200CK", "H\u200DK", "❤️ HK 02",
];
const invisibleOutput = main({
  proxies: [
    ...invisibleNames.map((name) => ss(name)),
    ss(zw("HK 01"), { server: "duplicate.example.com" }),
    ss(zw("官网公告")),
  ],
  dns: {}, hosts: {},
});
const invisibleGroups = new Map(invisibleOutput["proxy-groups"].map((group) => [group.name, group]));
assert(isDeepStrictEqual(invisibleOutput.proxies.slice(0, invisibleNames.length).map((proxy) => proxy.name), invisibleNames), "invisible characters and all distinct original names must be preserved in source order");
assert(invisibleOutput.proxies.length === invisibleNames.length + 2, "only exact duplicate names and information nodes may be removed");
assert(invisibleGroups.get("香港").proxies.includes(zw("HK 01")), "zero-width Hong Kong node must be recognized");
assert(invisibleGroups.get("新加坡").proxies.includes("\u3164SG\uFFA0 03"), "Hangul filler characters must not interrupt Singapore matching");
assert(invisibleGroups.get("台湾").proxies.includes(zw("TW 01")), "local Taiwan definition must also match through invisible characters");
assert(invisibleGroups.get("低倍率节点").proxies.includes(zw("日本 0.3x")), "zero-width low-rate node must be grouped");
assert(matching.toMatchableName("H\u200CK\u200DJ\uFE0F") === "H\u200CK\u200DJ\uFE0F", "ZWJ, ZWNJ and variation selectors must be retained");
assert(matching.toMatchableName("\uFEFFH\u202AK\u2060\u2063\u206601\u2069") === "HK01", "BOM and bidirectional/invisible controls must be ignored for matching");
matching.ruleOptionsEnable.过滤低倍率节点 = true;
try {
  const filtered = matching.filterProxies({ proxies: [ss(zw("HK 01")), ss(zw("日本 0.3x"))] });
  assert(isDeepStrictEqual(filtered.map((proxy) => proxy.name), [zw("HK 01")]), "low-rate filtering must use the matchable name");
} finally {
  matching.ruleOptionsEnable.过滤低倍率节点 = false;
}

assert(isDeepStrictEqual(buildReport.retained_services.GitHub.providers, ["github"]), "GitHub provider must belong to the upstream GitHub service");
assert(isDeepStrictEqual(buildReport.retained_services.GitHub.rules, ["RULE-SET,github,GitHub"]), "GitHub rule must follow its upstream service");
assert(!buildReport.retained_services.Microsoft.providers.includes("github"), "GitHub provider must no longer be extracted from Microsoft");
assert(output.rules.filter((rule) => rule === "RULE-SET,github,GitHub").length === 1, "GitHub rule must occur exactly once");

const bracketRateNames = ["日本【x0】", "日本\t0倍", "日本\u00a0x0 "];
const bracketRateOutput = main({ proxies: bracketRateNames.map((name) => ss(name)), dns: {}, hosts: {} });
const bracketRateGroup = bracketRateOutput["proxy-groups"].find((group) => group.name === "低倍率节点");
assert(
  JSON.stringify(bracketRateGroup?.proxies) === JSON.stringify(bracketRateNames),
  "upstream low-rate matching must support Chinese brackets and whitespace",
);

const repczSource = buildReport.real_ip_domains_upstream;
const excludedPatterns = new Set(["*-update.xoyocdn.com", "*-appboot.netflix.com"]);
assert(Array.isArray(repczSource?.domains) && repczSource.domains.length > 0, "Repcz source domains missing from build report");
assert(
  JSON.stringify(repczSource.applied_domains) === JSON.stringify(repczSource.domains.filter((domain) => !excludedPatterns.has(domain))),
  "Repcz applied domains differ from source after exclusions",
);
assert(
  JSON.stringify(repczSource.excluded_domains) === JSON.stringify(repczSource.domains.filter((domain) => excludedPatterns.has(domain))),
  "Repcz excluded domains differ from source",
);
for (const domain of repczSource.applied_domains) {
  assert(output.dns["fake-ip-filter"].includes(domain), "Repcz real-IP domain missing: " + domain);
}
for (const domain of repczSource.excluded_domains) {
  assert(!output.dns["fake-ip-filter"].includes(domain), "excluded Repcz domain remains: " + domain);
}
assert(!("repcz_real_ip_domains" in providers), "obsolete Repcz regex provider remains");
assert(!output.dns["fake-ip-filter"].some((pattern) => pattern.includes("DOMAIN-REGEX")), "regex rule remains in fake-IP filter");

assert(output.hosts["services.googleapis.cn"] === "services.googleapis.com", "Google service host mapping must follow upstream");

for (const host of [
  "+.mcdn.bilivideo.com",
  "+.mcdn.bilivideo.cn",
  "+.edge.mountaintoys.cn",
  "+.h2.smtcdns.net",
]) assert(!(host in output.hosts), `permanently excluded host must not remain: ${host}`);

for (const required of [
  "private", "private_ip", "steam_cn", "apple_cn", "microsoft_cn", "geolocation-cn",
  "cn_ip", "geolocation-!cn", "fakeip_filter", "cn", "douyin", "google", "google_ip",
  "telegram", "telegram_ip", "steam", "steam_ip", "tiktok", "tiktok_ip",
  "twitter", "twitter_ip", "facebook_ip", "twitch", "appletv", "claude", "bypass_japan",
]) assert(required in providers, `required provider missing: ${required}`);

for (const redundant of ["facebook", "threads"]) {
  assert(!(redundant in providers), `redundant Meta-family provider remains: ${redundant}`);
}
assert(!output.rules.some((rule) => /^RULE-SET,(?:facebook|threads),/.test(rule)), "redundant Meta-family rule remains");
assert(
  output.rules.filter((rule) => rule === "RULE-SET,facebook_ip,媒体,no-resolve").length === 1,
  "Meta must retain exactly one Facebook IP fallback",
);
assert(
  output.rules.indexOf("RULE-SET,facebook_ip,媒体,no-resolve") === output.rules.indexOf("RULE-SET,meta,媒体") + 1,
  "Meta IP fallback must immediately follow the Meta domain rule",
);

for (const rule of output.rules) {
  const parts = rule.split(",");
  if (parts[0] === "RULE-SET") assert(parts[1] in providers, `rule references missing provider: ${parts[1]}`);
}
assert(!output.rules.some((rule) => /qwen|qbittorrent|cn_additional|googlefcm/i.test(rule)), "unapproved handwritten or removed rules remain");
assert(!("games_cn" in providers), "broad games_cn provider must be replaced");
assert(!output.rules.some((rule) => rule.startsWith("RULE-SET,games_cn,")), "broad games_cn rule must be replaced");
assert(providers.steam_cn.url.endsWith("/geosite/steam@cn.mrs"), "Steam CN must inherit the upstream mirror with the steam@cn ruleset");
assert(providers.steam_cn.path === "./ruleset/steam@cn.mrs", "Steam CN cache path must use the new ruleset");
assert(providers.steam_cn["path-in-bundle"] === "geo/geosite/steam@cn.mrs", "Steam CN bundle path must use the new ruleset");
assert(buildReport.retained_base_rule_providers.includes("steam_cn") && !buildReport.retained_base_rule_providers.includes("games_cn"), "build report must record the effective Steam CN replacement");
assert(output.rules.filter((rule) => rule === "RULE-SET,steam_cn,Direct").length === 1, "Steam CN direct rule must occur exactly once");
assert(output.rules.indexOf("RULE-SET,steam_cn,Direct") < output.rules.indexOf("RULE-SET,steam,Proxy"), "Steam CN direct rule must precede Steam proxy routing");
assert(output.rules.indexOf("RULE-SET,apple_cn,Direct") < output.rules.indexOf("RULE-SET,apple,Proxy"), "Apple CN layering order is wrong");
assert(providers.apple.format === "mrs" && providers.apple.behavior === "domain", "Apple merge must use domain MRS");
assert(providers.apple.url === "https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/apple-merged.mrs", "Apple must use the shared merged provider");
assert(!("path-in-bundle" in providers.apple), "Apple merge cannot reference the Bett bundle");
assert(output.rules.indexOf("RULE-SET,apple_ip,Proxy,no-resolve") === output.rules.indexOf("RULE-SET,apple,Proxy") + 1, "Apple IP pair must remain adjacent");

assert(output.rules.indexOf("RULE-SET,microsoft_cn,Direct") < output.rules.indexOf("RULE-SET,microsoft,Proxy"), "Microsoft CN layering order is wrong");
assert(output.rules.includes("RULE-SET,github,GitHub"), "GitHub rules must use the dedicated GitHub policy group");
assert(!output.rules.includes("RULE-SET,github,Proxy"), "GitHub rules must not fall back to Proxy directly");
assert(buildReport.retained_base_rule_providers.includes("douyin"), "Douyin base provider missing from generation report");
assert(providers.ai.type === "http" && providers.ai.format === "mrs" && providers.ai.behavior === "domain", "AI provider format changed");
assert(providers.ai.url === "https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/ai.mrs", "AI provider must use the converter MRS");
assert(!("path-in-bundle" in providers.ai), "external AI MRS cannot reference the Bett bundle");
assert(buildReport.service_provider_url_overrides.AI.ai === providers.ai.url, "AI override missing from build report");
assert(providers.douyin["path-in-bundle"] === "geo/geosite/douyin.mrs", "Douyin bundle path changed");
assert(providers["mcdn屏蔽"].type === "http" && providers["mcdn屏蔽"].format === "mrs" && providers["mcdn屏蔽"].behavior === "domain", "MCDN block provider must be domain MRS");
assert(providers["mcdn屏蔽"].url === "https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/mcdn-block.mrs", "MCDN block must use converter MRS");
assert(providers["mcdn屏蔽"].path === "./ruleset/mcdn-block.mrs", "MCDN provider cache path changed");
assert(!("path-in-bundle" in providers["mcdn屏蔽"]), "MCDN provider cannot reference the Bett bundle");
assert(providers.appletv.format === "mrs" && providers.appletv.behavior === "domain", "AppleTV must use domain MRS");
assert(providers.appletv.url === "https://raw.githubusercontent.com/appshubcc/bett-rules/meta/geo/geosite/apple-tvplus.mrs", "AppleTV must use the full Bett provider");
assert(output.rules.includes("RULE-SET,appletv,媒体"), "AppleTV must target the media group");

assert(isDeepStrictEqual(buildReport.prefix_rule_policy, manifest.upstream_prefix_rules), "prefix policy must match the manifest");
const prefixPlacement = new Function(source + "\nreturn upstreamPrefixRules;")();
assert(isDeepStrictEqual(prefixPlacement, buildReport.applied_prefix_rules), "prefix rules must match build provenance");
const cdnRule = "DOMAIN,cdn.jsdmirror.com,Direct";
const nvidiaDownloadRule = "DOMAIN,international-gfe.download.nvidia.com,Direct";
const directRuleSetPrefix = prefixPlacement.direct.filter((rule) => rule.startsWith("RULE-SET,"));
const directDomainSuffix = prefixPlacement.direct.filter((rule) => !rule.startsWith("RULE-SET,"));
const expectedDirectBlock = [
  ...prefixPlacement.bootstrap,
  "RULE-SET,private,Direct",
  "RULE-SET,private_ip,Direct,no-resolve",
  "RULE-SET,mcdn屏蔽,REJECT",
  ...directRuleSetPrefix,
  ...directDomainSuffix,
];
const directBlockStart = output.rules.indexOf(expectedDirectBlock[0]);
assert(directBlockStart >= 0 && isDeepStrictEqual(
  output.rules.slice(directBlockStart, directBlockStart + expectedDirectBlock.length),
  expectedDirectBlock,
), "direct exception block must keep CDN, private, MCDN, CN rulesets, and download hosts in order");
assert(output.rules.indexOf(cdnRule) === output.rules.indexOf("RULE-SET,facebook_ip,媒体,no-resolve") + 1, "direct exception block must follow the media rules");
assert(output.rules.indexOf(nvidiaDownloadRule) > output.rules.indexOf("RULE-SET,microsoft_cn,Direct"), "download hosts must follow the CN direct rulesets");
for (const rule of [
  "DOMAIN,international-gfe.download.nvidia.com,Direct",
  "RULE-SET,nvidia_cn,Direct",
  "DOMAIN-SUFFIX,ctaiot.com,Direct",
]) {
  const index = output.rules.indexOf(rule);
  assert(index > output.rules.indexOf("RULE-SET,mcdn屏蔽,REJECT"), "MCDN must retain priority over " + rule);
  assert(index < output.rules.indexOf("RULE-SET,steam,Proxy"), "direct exceptions must precede Steam and broad proxy routing: " + rule);
  assert(output.rules.filter((value) => value === rule).length === 1, "direct rule must occur once: " + rule);
}
assert(!("epicgames" in providers), "Epic Games provider is explicitly excluded");
assert(!output.rules.some((rule) => rule.startsWith("RULE-SET,epicgames,")), "Epic Games routing is explicitly excluded");
assert(!output.rules.includes("DOMAIN,fsend.cn,Direct"), "existing fsend exclusion must be retained");
assert(providers.nvidia_cn.behavior === "domain" && providers.nvidia_cn.format === "mrs", "NVIDIA CN must use upstream domain MRS");
assert(providers.nvidia_cn.url.endsWith("/geosite/nvidia@cn.mrs"), "NVIDIA CN must use the upstream ruleset");
const expectedPrefixPlacement = { bootstrap: [], direct: [] };
const sourceDownloadHosts = new Set(Object.values(buildReport.upstream_base_rule_providers).map((provider) => new URL(provider.url).hostname));
const existingPrefixProviders = new Set(manifest.upstream_prefix_rules.existing_rule_providers);
for (const rule of buildReport.upstream_prefix_rules) {
  if (excludedPrefixRules.has(rule)) continue;
  const parts = rule.split(",");
  if (parts[0] === "RULE-SET") {
    if (existingPrefixProviders.has(parts[1])) continue;
    parts[1] = manifest.base_rule_provider_replacements?.[parts[1]]?.name || parts[1];
  }
  parts[2] = "Direct";
  const value = parts.join(",");
  const bucket = parts[0] === "DOMAIN" && sourceDownloadHosts.has(parts[1]) ? "bootstrap" : "direct";
  if (!expectedPrefixPlacement[bucket].includes(value)) expectedPrefixPlacement[bucket].push(value);
}
assert(isDeepStrictEqual(prefixPlacement, expectedPrefixPlacement), "every selected upstream prefix rule must be incorporated");
for (const bucket of Object.values(prefixPlacement)) {
  for (const rule of bucket) assert(output.rules.filter((value) => value === rule).length === 1, "upstream prefix rule must occur once: " + rule);
}

const reviewedOrder = [
  "claude", "ai", "github", "telegram", "telegram_ip",
  "appletv", "twitch", "twitter", "twitter_ip", "tiktok", "tiktok_ip", "youtube", "meta", "facebook_ip",
  "private", "private_ip", "mcdn屏蔽", "steam_cn", "nvidia_cn", "apple_cn", "microsoft_cn", "steam", "steam_ip", "pikpak", "ehentai", "bypass_japan",
  "google", "google_ip", "apple", "apple_ip", "microsoft", "microsoft_ip",
  "geolocation-!cn", "geolocation-cn", "cn_ip",
];
const reviewedPositions = reviewedOrder.map((provider) => output.rules.findIndex((rule) => rule.split(",")[1] === provider));
assert(reviewedPositions.every((position, index) => position >= 0 && (index === 0 || position > reviewedPositions[index - 1])), "Reviewed business and fallback order changed");
assert(!Object.values(providers).some((provider) => /geoip\/openai\.mrs$/.test(provider.url || "")), "AI must not gain an OpenAI IP provider");
assert(output.rules.filter(rule => rule === "RULE-SET,mcdn屏蔽,REJECT").length === 1, "MCDN rejection must not be duplicated");

const googleQuicReject = "AND,((RULE-SET,google),(NETWORK,UDP),(DST-PORT,443)),REJECT";
assert(!output.rules.includes(googleQuicReject), "Google QUIC REJECT rule must be removed");
assert(output.rules.includes("RULE-SET,google,Google"), "Google TCP routing must retain its policy group");
assert(output.rules.includes("RULE-SET,google_ip,Google,no-resolve"), "Google IP fallback must remain unchanged");
for (const [name, group] of groups) {
  assert(!("disable-udp" in group), `UDP support must remain unchanged for ${name}`);
}
assert(providers.bypass_japan.type === "http" && providers.bypass_japan.format === "mrs" && providers.bypass_japan.behavior === "domain", "pron provider format changed");
assert(providers.bypass_japan.url === "https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/bypass-japan.mrs", "pron provider must use converter MRS");
assert(providers.bypass_japan.path === "./ruleset/bypass-japan.mrs", "pron provider path changed");
assert(providers.claude.type === "http", "Claude provider type changed");
assert(providers.claude.format === "yaml", "Claude provider must use YAML");
assert(providers.claude.behavior === "classical", "Claude provider must be classical");
assert(
  providers.claude.url === "https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/claude.yaml",
  "Claude provider must use the converter repository",
);
assert(output.rules.includes("RULE-SET,claude,Claude"), "Claude rule is missing");
assert(output.rules.includes("RULE-SET,youtube,YouTube"), "YouTube rule must use its dedicated policy group");
assert(!output.rules.includes("RULE-SET,youtube,媒体"), "YouTube rule must not use the media group");
assert(output.rules.includes("RULE-SET,bypass_japan,pron"), "pron rule is missing");
assert(
  output.rules.indexOf("RULE-SET,claude,Claude") < output.rules.indexOf("RULE-SET,ai,AI")
  && output.rules.indexOf("RULE-SET,ai,AI") < output.rules.indexOf("RULE-SET,github,GitHub"),
  "Claude and AI must precede GitHub in order",
);
assert(
  output.rules.indexOf("RULE-SET,bypass_japan,pron") < output.rules.indexOf("RULE-SET,geolocation-!cn,Proxy"),
  "pron rule must precede the broad foreign fallback",
);
assert(
  output.rules.indexOf("RULE-SET,claude,Claude") < output.rules.indexOf("RULE-SET,ai,AI"),
  "Claude rule must precede the generic AI rule",
);
assert(output.rules[output.rules.length - 1] === "MATCH,Final", "Final rule must remain last");

for (const forbidden of ["customizeProxies", "buildCustomizeProxies", "代理IPV4优先", "代理IPV6优先", "过滤高倍率节点"]) {
  assert(!source.includes(forbidden), `dead feature remains in generated source: ${forbidden}`);
}

// Taiwan is a local region even when the upstream definition is removed.
// Include an exclusion keyword to exercise region-based retention as well.
const taiwanNames = ["🇹🇼 01", "台湾 01", "台北 01", "高雄 01", "TW 01", "TWN 01", "Taiwan 01", "台湾 备用 01"];
const taiwanOutput = main({
  proxies: [...taiwanNames.map((name) => ss(name)), ss("韩国 01")],
  dns: {},
  hosts: {},
});
const taiwanGroups = new Map(taiwanOutput["proxy-groups"].map((group) => [group.name, group]));
assert(JSON.stringify(taiwanGroups.get("台湾")?.proxies) === JSON.stringify(taiwanNames), "local Taiwan matching and region grouping must be preserved");
assert(taiwanGroups.get("台湾").icon === buildReport.applied_group_icons["台湾"], "Taiwan SVG icon must follow upstream");
assert(JSON.stringify(taiwanGroups.get("其他节点")?.proxies) === JSON.stringify(["韩国 01"]), "Taiwan nodes must not fall into Other");
assert(JSON.stringify(taiwanGroups.get("订阅").proxies) === JSON.stringify([...taiwanNames, "韩国 01"]), "Taiwan nodes must remain in the subscription group");
for (const name of ["Proxy", "AI", "Claude"]) {
  assert(taiwanGroups.get(name).proxies.includes("台湾"), `Taiwan choice missing from ${name}`);
}

if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(`Validated ${output.proxies.length} proxies, ${groups.size} groups, ${Object.keys(providers).length} providers, and ${output.rules.length} rules.`);
