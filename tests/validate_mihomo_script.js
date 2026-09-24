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
assert(!proxyNames.some((name) => name.includes("香港")), "Hong Kong nodes must be removed");
assert(!proxyNames.some((name) => name.includes("官网")), "airport information nodes must be removed");
assert(output.proxies.every((proxy) => !("dialer-proxy" in proxy)), "dialer-proxy must be removed from every node");
assert(proxyNames.includes("日本 01") && proxyNames.includes("美国 01") && proxyNames.includes("韩国 01"), "original node names must be preserved");

assert(groups.has("订阅"), "subscription group is missing");
assert(JSON.stringify(groups.get("订阅").proxies) === JSON.stringify(["日本 01", "美国 01", "韩国 01", "日本 0.5x"]), "subscription group must expand filtered airport nodes in source order");
assert(groups.get("Proxy").proxies[0] === "订阅", "Proxy must select subscription first");
assert(groups.has("Claude"), "Claude policy group is missing");
assert(
  JSON.stringify(groups.get("Claude").proxies) === JSON.stringify(groups.get("AI").proxies),
  "Claude policy choices must follow the AI group",
);
assert(JSON.stringify(groups.get("Direct").proxies) === JSON.stringify(["DIRECT", "IPv4优先", "IPv6优先"]), "Direct choices changed");
assert(groups.get("其他节点").proxies.includes("韩国 01"), "unrecognized normal regions must enter Other");
assert(groups.get("低倍率节点").proxies.includes("日本 0.5x"), "low-rate node grouping failed");
assert(!groups.has("香港") && !groups.has("GLOBAL") && !groups.has("高倍率节点"), "forbidden groups were generated");

for (const group of groups.values()) {
  assert(group["empty-fallback"] === "REJECT", `empty-fallback missing from ${group.name}`);
  for (const field of ["url", "interval", "timeout", "lazy", "max-failed-times", "icon"]) {
    assert(!(field in group), `unexpected ${field} in ${group.name}`);
  }
}

assert(Array.isArray(output.dns["proxy-server-nameserver"]) && output.dns["proxy-server-nameserver"].length > 0, "proxy server DNS must follow upstream DNS configuration");
assert(Array.isArray(output.dns["default-nameserver"]) && output.dns["default-nameserver"].length > 0, "default DNS must follow upstream DNS configuration");
assert(JSON.stringify(output.dns["nameserver-policy"]["rule-set:cn"]) === JSON.stringify(["system"]), "CN domains must use system DNS");
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
  "cn_ip", "geolocation-!cn", "fakeip_filter", "cn", "google", "google_ip",
  "telegram", "telegram_ip", "steam", "steam_ip", "tiktok", "tiktok_ip",
  "twitter", "twitter_ip", "facebook", "facebook_ip", "threads", "twitch", "claude",
]) assert(required in providers, `required provider missing: ${required}`);

for (const rule of output.rules) {
  const parts = rule.split(",");
  if (parts[0] === "RULE-SET") assert(parts[1] in providers, `rule references missing provider: ${parts[1]}`);
}
assert(!output.rules.some((rule) => /qwen|qbittorrent|cn_additional|googlefcm/i.test(rule)), "unapproved handwritten or removed rules remain");
assert(output.rules.indexOf("RULE-SET,apple_cn,Direct") < output.rules.indexOf("RULE-SET,apple,Proxy"), "Apple CN layering order is wrong");
assert(output.rules.indexOf("RULE-SET,microsoft_cn,Direct") < output.rules.indexOf("RULE-SET,microsoft,Proxy"), "Microsoft CN layering order is wrong");
assert(providers.claude.type === "http", "Claude provider type changed");
assert(providers.claude.format === "yaml", "Claude provider must use YAML");
assert(providers.claude.behavior === "classical", "Claude provider must be classical");
assert(
  providers.claude.url === "https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/claude.yaml",
  "Claude provider must use the converter repository",
);
assert(output.rules.includes("RULE-SET,claude,Claude"), "Claude rule is missing");
assert(
  output.rules.indexOf("RULE-SET,claude,Claude") < output.rules.indexOf("RULE-SET,ai,AI"),
  "Claude rule must precede the generic AI rule",
);
assert(output.rules[output.rules.length - 1] === "MATCH,Final", "Final rule must remain last");

for (const forbidden of ["customizeProxies", "buildCustomizeProxies", "代理IPV4优先", "代理IPV6优先", "过滤高倍率节点"]) {
  assert(!source.includes(forbidden), `dead feature remains in generated source: ${forbidden}`);
}

if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(`Validated ${output.proxies.length} proxies, ${groups.size} groups, ${Object.keys(providers).length} providers, and ${output.rules.length} rules.`);
