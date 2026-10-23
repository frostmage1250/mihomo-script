#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { isDeepStrictEqual } = require("util");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "mihomoScript.js"), "utf8");
const upstreamSource = fs.readFileSync(path.join(root, "Script", "mihomoScript.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "custom", "customizations.json"), "utf8"));
const report = JSON.parse(fs.readFileSync(path.join(root, "custom", "upstream.json"), "utf8"));
const runtime = new Function(source + "\nreturn {main, additionalServiceDefinitions, additionalRuleProviders, upstreamPrefixRules, serviceRuleBlocks, excludeFilter, regionDefinitions, rateRegionDefinitions, invisibleCharsRegex, toMatchableName, getMatchedRegions, filterProxies, ruleOptionsEnable};")();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function same(actual, expected, message) {
  assert(isDeepStrictEqual(actual, expected), message);
}
function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function policy(rule) {
  const match = /,([^,()]+)((?:,(?:no-resolve|src|dst))*)$/.exec(rule);
  assert(match, "rule policy missing: " + rule);
  return match;
}
function withTarget(rule, target) {
  const match = policy(rule);
  return rule.slice(0, match.index) + "," + target + match[2];
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

const upstream = new Function(upstreamSource + "\nreturn {main, groupBaseOption, serviceConfigs, baseRuleProviders, prefixRules, blockForeignQuic, regionDefinitions, rateRegionDefinitions, excludeFilter, invisibleCharsRegex, toMatchableName, getMatchedRegions};")();

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

const output = runtime.main(fixture);
const proxyNames = output.proxies.map((proxy) => proxy.name);
const groups = new Map(output["proxy-groups"].map((group) => [group.name, group]));
const providers = output["rule-providers"];

const subscriptionNames = ["日本 01", "香港 01", "新加坡 01", "美国 01", "韩国 01", "日本 0.5x"];
same(proxyNames, [...subscriptionNames, "IPv4优先", "IPv6优先"], "node filtering, deduplication, names, or direct nodes changed");
same(output.proxies.find(proxy => proxy.name === "日本 01").server, "node.example.com", "duplicate node selection changed");
assert(output.proxies.every(proxy => !("dialer-proxy" in proxy)), "dialer-proxy cleanup failed");
const expectedChoices = {
  "订阅": subscriptionNames,
  Proxy: ["订阅", ...upstream.regionDefinitions.filter(region =>
    subscriptionNames.some(node => region.regex.test(upstream.toMatchableName(node)))
  ).map(region => region.name), "其他节点", "低倍率节点", ...subscriptionNames],
  Direct: ["DIRECT", "IPv4优先", "IPv6优先"],
  GitHub: ["Proxy", "订阅", "AI"],
  Claude: ["Proxy", "订阅", "日本", "其他节点"],
  AI: ["Proxy", "日本", "其他节点"],
  pron: ["Proxy", "香港", "新加坡"],
  Google: ["Proxy", "订阅"],
  "媒体": ["Proxy", "低倍率节点", "香港"],
  YouTube: ["Proxy", "香港", "低倍率节点"],
  Telegram: ["Proxy", "低倍率节点", "香港"],
  PikPak: ["Proxy", "Direct", "低倍率节点", "香港"],
  "香港": ["香港 01"],
  "其他节点": ["韩国 01"],
  "低倍率节点": ["日本 0.5x"],
};
for (const [name, choices] of Object.entries(expectedChoices)) {
  same(groups.get(name)?.proxies, choices, "local policy choices changed: " + name);
}
assert(!groups.has("GLOBAL") && !groups.has("高倍率节点"), "local group selection changed");

const nativeOutput = upstream.main({proxies: [ss("日本 fixture"), ss("fixture-other")], dns: {}, hosts: {}});
const upstreamIcons = Object.fromEntries([
  ...upstream.serviceConfigs, ...upstream.regionDefinitions, ...upstream.rateRegionDefinitions,
  ...nativeOutput["proxy-groups"],
].filter(group => group.icon !== undefined).map(({name, icon}) => [name, icon]));
const selectedServices = upstream.serviceConfigs.filter(service =>
  service.rules?.length && !manifest.excluded_services.includes(service.name)
);
const selectedBase = Object.fromEntries(Object.entries(upstream.baseRuleProviders).filter(
  ([name]) => !manifest.excluded_base_rule_providers.includes(name)
));
const nativeServiceRules = new Set(upstream.serviceConfigs.flatMap(service => service.rules || []));
const nativePrefix = new Set(upstream.prefixRules);
const nativeQuic = new Set(upstream.blockForeignQuic);
const nativeFallback = nativeOutput.rules.filter(rule =>
  !nativeServiceRules.has(rule) && !nativePrefix.has(rule) && !nativeQuic.has(rule)
);

same(report.fork.source_mode, "native-git-merge", "source provenance mode changed");
same(report.fork.source_sha256, digest(upstreamSource), "complete upstream source digest differs");
same(report.output_sha256, digest(source), "published script digest differs");
same(report.upstream_base_rule_providers, selectedBase, "current base provider snapshot differs");
same(report.upstream_service_rule_providers, Object.fromEntries(
  selectedServices.map(service => [service.name, service.providers || {}])
), "current service provider snapshot differs");
same(report.upstream_prefix_rules, upstream.prefixRules, "upstream prefix provenance differs");
same(report.upstream_fallback_rules, nativeFallback, "upstream fallback provenance differs");

function applyUrlOverride(provider, url) {
  const value = {...provider};
  if (url !== undefined) {
    value.url = url;
    delete value["path-in-bundle"];
  }
  return value;
}
const expectedProviders = {};
for (const [name, provider] of Object.entries(selectedBase)) {
  const replacement = manifest.base_rule_provider_replacements[name];
  const expected = {...provider};
  if (replacement) {
    const suffix = "/" + replacement.from + ".mrs";
    for (const field of ["url", "path", "path-in-bundle"]) {
      if (expected[field] !== undefined) {
        assert(expected[field].endsWith(suffix), "explicit replacement source changed: " + name + "." + field);
        expected[field] = expected[field].slice(0, -suffix.length) + "/" + replacement.to + ".mrs";
      }
    }
  }
  expectedProviders[replacement?.name || name] = applyUrlOverride(
    expected, manifest.base_rule_provider_url_overrides[name]
  );
}
for (const service of selectedServices) {
  for (const [name, provider] of Object.entries(service.providers || {})) {
    expectedProviders[name] = applyUrlOverride(provider, manifest.service_provider_url_overrides[service.name]?.[name]);
  }
}
for (const service of Object.values(runtime.additionalServiceDefinitions)) {
  Object.assign(expectedProviders, service.providers || {});
}
Object.assign(expectedProviders, runtime.additionalRuleProviders);
same(providers, expectedProviders, "published providers differ from current upstream plus explicit custom sources");

const routingPlan = [
  ...selectedServices.map(service => ({...service, origin: "upstream"})),
  ...Object.entries(runtime.additionalServiceDefinitions).map(([name, value]) => ({name, ...value, origin: "custom"})),
].map((service, sequence) => ({
  ...service, sequence, ...manifest.default_service_routing, ...manifest.service_routing[service.name],
})).sort((a, b) => a.order - b.order || a.sequence - b.sequence);
const expectedServiceBlocks = {before_direct: [], after_direct: []};
for (const entry of routingPlan) {
  expectedServiceBlocks[entry.section].push(...entry.rules.map(rule => withTarget(rule, entry.target)));
}
same(runtime.serviceRuleBlocks, expectedServiceBlocks, "current upstream service rules/targets/order differ");
same(report.applied_service_rule_blocks, expectedServiceBlocks, "service block provenance differs");
same(runtime.upstreamPrefixRules, report.applied_prefix_rules, "base rule placement provenance differs");
const basePlacement = runtime.upstreamPrefixRules;
const expectedRules = [
  ...expectedServiceBlocks.before_direct,
  ...basePlacement.bootstrap,
  ...basePlacement.private,
  "RULE-SET,mcdn屏蔽,REJECT",
  ...basePlacement.direct,
  ...expectedServiceBlocks.after_direct,
  ...basePlacement.fallback,
  "MATCH,Final",
];
same(output.rules, expectedRules, "routing block sequence differs from local policy");
assert(new Set(output.rules).size === output.rules.length, "duplicate final rules found");

const expectedTargets = new Set(["DIRECT", "REJECT", "REJECT-DROP", "PASS", ...groups.keys(), ...proxyNames]);
for (const rule of output.rules) {
  assert(expectedTargets.has(policy(rule)[1]), "rule references missing target: " + rule);
  for (const match of rule.matchAll(/(?:^|[,(])RULE-SET,([^,()]+)/g)) {
    assert(Object.hasOwn(providers, match[1]), "rule references missing provider: " + match[1]);
  }
}
for (const [name, group] of groups) {
  for (const target of group.proxies) assert(expectedTargets.has(target), "group references missing target: " + name + " -> " + target);
  same(group.type, "select", "manual group type changed: " + name);
  same(group.interval, 0, "manual group test interval changed: " + name);
  same(group["empty-fallback"], "REJECT", "empty group fallback changed: " + name);
  for (const field of ["timeout", "lazy", "max-failed-times", "disable-udp"]) {
    assert(!Object.hasOwn(group, field), "unexpected local group setting: " + name + "." + field);
  }
  same(group.url, upstream.groupBaseOption.url, "test URL differs from upstream: " + name);
  const upstreamName = manifest.group_icon_sources[name] ||
    (upstream.regionDefinitions.some(region => region.name === name) ? name : undefined);
  same(group.icon, upstreamName ? upstreamIcons[upstreamName] : undefined, "icon differs from upstream selection: " + name);
}
same(report.upstream_group_test_url, upstream.groupBaseOption.url, "test URL provenance differs");
same(report.upstream_group_icons, upstreamIcons, "icon provenance differs");
for (const name of ["Claude", "媒体", "pron"]) {
  assert(!Object.hasOwn(groups.get(name), "icon"), "custom group icon should be omitted: " + name);
}

same(String(runtime.excludeFilter), String(upstream.excludeFilter), "node exclusion expression differs from upstream");
same(String(runtime.invisibleCharsRegex), String(upstream.invisibleCharsRegex), "invisible-character expression differs");
for (const name of ["toMatchableName", "getMatchedRegions"]) {
  same(String(runtime[name]), String(upstream[name]), "matching helper differs from current upstream: " + name);
}
same(
  runtime.regionDefinitions.map(({name, regex}) => ({name, regex: String(regex)})),
  upstream.regionDefinitions.map(({name, regex}) => ({name, regex: String(regex)})),
  "complete region definitions must follow current upstream names, order, and matching",
);
for (const kind of ["regionDefinitions", "rateRegionDefinitions"]) {
  for (const definition of report.upstream_matching[kind]) {
    same(String(runtime[kind].find(item => item.name === definition.name)?.regex), definition.regex, "region expression differs: " + definition.name);
  }
}

const zw = name => [...name].join("\u200B");
const invisibleNames = [zw("HK 01"), "\u3164SG\uFFA0 03", zw("TW 01"), zw("日本 0.3x"), "HK 01", "H\u200CK", "H\u200DK", "❤️ HK 02"];
const invisibleOutput = runtime.main({
  proxies: [...invisibleNames.map(name => ss(name)), ss(zw("HK 01")), ss(zw("官网公告"))],
  dns: {}, hosts: {},
});
const invisibleGroups = new Map(invisibleOutput["proxy-groups"].map(group => [group.name, group]));
same(invisibleOutput.proxies.slice(0, invisibleNames.length).map(proxy => proxy.name), invisibleNames, "distinct original names/order changed");
same(invisibleOutput.proxies.length, invisibleNames.length + 2, "node deduplication/filtering changed");
assert(invisibleGroups.get("香港").proxies.includes(zw("HK 01")), "Hong Kong match through invisible characters failed");
assert(invisibleGroups.get("新加坡").proxies.includes("\u3164SG\uFFA0 03"), "Singapore match through fillers failed");
if (upstream.regionDefinitions.some(region => region.name === "台湾")) {
  assert(invisibleGroups.get("台湾").proxies.includes(zw("TW 01")), "upstream Taiwan match through invisible characters failed");
}
assert(invisibleGroups.get("低倍率节点").proxies.includes(zw("日本 0.3x")), "low-rate matching failed");
runtime.ruleOptionsEnable.过滤低倍率节点 = true;
try {
  same(runtime.filterProxies({proxies: [ss(zw("HK 01")), ss(zw("日本 0.3x"))]}).map(proxy => proxy.name),
    [zw("HK 01")], "low-rate filtering changed");
} finally {
  runtime.ruleOptionsEnable.过滤低倍率节点 = false;
}

const taiwanNames = ["🇹🇼 01", "台湾 01", "台北 01", "高雄 01", "TW 01", "TWN 01", "Taiwan 01", "台湾 备用 01"];
const taiwanOutput = runtime.main({proxies: [...taiwanNames.map(name => ss(name)), ss("韩国 01")], dns: {}, hosts: {}});
const taiwanGroups = new Map(taiwanOutput["proxy-groups"].map(group => [group.name, group]));
const nativeTaiwan = upstream.regionDefinitions.find(region => region.name === "台湾");
if (nativeTaiwan) {
  same(taiwanGroups.get("台湾").proxies, taiwanNames, "upstream Taiwan matching changed");
  same(taiwanGroups.get("其他节点").proxies, ["韩国 01"], "region classification changed");
  for (const name of ["Proxy", "AI", "Claude"]) {
    assert(taiwanGroups.get(name).proxies.includes("台湾"), "Taiwan choice missing: " + name);
  }
} else {
  assert(!taiwanGroups.has("台湾"), "removed upstream Taiwan region should stay omitted");
}

same(output.dns["nameserver-policy"]["rule-set:cn"], ["system"], "mainland DNS policy changed");
same(output.dns["direct-nameserver"], ["system"], "direct DNS policy changed");
for (const value of [...Object.keys(output.dns["nameserver-policy"]), ...output.dns["fake-ip-filter"]]) {
  const match = /^rule-set:(.+)$/.exec(value);
  if (match) assert(Object.hasOwn(providers, match[1]), "DNS references missing provider: " + match[1]);
}
assert(!output.dns["fake-ip-filter"].includes("rule-set:googlefcm"), "FCM DNS exclusion failed");
assert(!source.includes("minimalModeEnabled") && !source.includes("googlefcm"), "FCM/minimal-mode source cleanup failed");
const repcz = report.real_ip_domains_upstream;
const excludedPatterns = new Set(["*-update.xoyocdn.com", "*-appboot.netflix.com"]);
same(repcz.applied_domains, repcz.domains.filter(domain => !excludedPatterns.has(domain)), "real-IP source selection changed");
for (const domain of repcz.applied_domains) {
  assert(output.dns["fake-ip-filter"].includes(domain), "real-IP pattern missing: " + domain);
}
for (const domain of repcz.excluded_domains) {
  assert(!output.dns["fake-ip-filter"].includes(domain), "excluded real-IP pattern remains: " + domain);
}
same(output.hosts["services.googleapis.cn"], nativeOutput.hosts["services.googleapis.cn"], "upstream Google host mapping differs");
for (const host of ["+.mcdn.bilivideo.com", "+.mcdn.bilivideo.cn", "+.edge.mountaintoys.cn", "+.h2.smtcdns.net"]) {
  assert(!Object.hasOwn(output.hosts, host), "excluded PCDN host remains: " + host);
}

if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(output, null, 2) + "\n", "utf8");
console.log("Validated " + output.proxies.length + " proxies, " + groups.size + " groups, " + Object.keys(providers).length + " providers, and " + output.rules.length + " rules.");
