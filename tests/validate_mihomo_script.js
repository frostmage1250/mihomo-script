#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

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
  for (const field of ["url", "interval", "timeout", "lazy", "max-failed-times", "icon"]) {
    assert(!(field in group), `unexpected ${field} in ${group.name}`);
  }
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

const buildReport = JSON.parse(fs.readFileSync(path.join(root, "reports", "mihomo-script-upstream.json"), "utf8"));
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

for (const host of [
  "services.googleapis.cn",
  "+.mcdn.bilivideo.com",
  "+.mcdn.bilivideo.cn",
  "+.edge.mountaintoys.cn",
  "+.h2.smtcdns.net",
]) assert(!(host in output.hosts), `permanently excluded host must not remain: ${host}`);

for (const required of [
  "private", "private_ip", "games_cn", "apple_cn", "microsoft_cn", "geolocation-cn",
  "cn_ip", "geolocation-!cn", "fakeip_filter", "cn", "douyin", "google", "google_ip",
  "telegram", "telegram_ip", "steam", "steam_ip", "tiktok", "tiktok_ip",
  "twitter", "twitter_ip", "facebook_ip", "twitch", "claude", "bypass_japan",
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
assert(providers.ai.path === "./ruleset/ai.mrs", "AI provider path changed");
assert(!("path-in-bundle" in providers.ai), "external AI MRS cannot reference the Bett bundle");
assert(buildReport.service_provider_url_overrides.AI.ai === providers.ai.url, "AI override missing from build report");
assert(providers.douyin.type === "http" && providers.douyin.format === "mrs" && providers.douyin.behavior === "domain", "Douyin provider format changed");
assert(providers.douyin.url === "https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/geosite/douyin.mrs", "Douyin provider URL changed");
assert(providers.douyin.path === "./ruleset/douyin.mrs", "Douyin provider path changed");
assert(providers.douyin["path-in-bundle"] === "geo/geosite/douyin.mrs", "Douyin bundle path changed");
assert(providers["mcdn屏蔽"].type === "http" && providers["mcdn屏蔽"].format === "mrs" && providers["mcdn屏蔽"].behavior === "domain", "MCDN block provider must be domain MRS");
assert(providers["mcdn屏蔽"].url === "https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/mcdn-block.mrs", "MCDN block must use converter MRS");
assert(providers["mcdn屏蔽"].path === "./ruleset/mcdn-block.mrs", "MCDN provider cache path changed");
assert(!("path-in-bundle" in providers["mcdn屏蔽"]), "MCDN provider cannot reference the Bett bundle");
assert(output.rules[0] === "RULE-SET,mcdn屏蔽,REJECT", "MCDN rejection must precede general routing");
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
assert(JSON.stringify(taiwanGroups.get("其他节点")?.proxies) === JSON.stringify(["韩国 01"]), "Taiwan nodes must not fall into Other");
assert(JSON.stringify(taiwanGroups.get("订阅").proxies) === JSON.stringify([...taiwanNames, "韩国 01"]), "Taiwan nodes must remain in the subscription group");
for (const name of ["Proxy", "AI", "Claude"]) {
  assert(taiwanGroups.get(name).proxies.includes("台湾"), `Taiwan choice missing from ${name}`);
}

if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(`Validated ${output.proxies.length} proxies, ${groups.size} groups, ${Object.keys(providers).length} providers, and ${output.rules.length} rules.`);
