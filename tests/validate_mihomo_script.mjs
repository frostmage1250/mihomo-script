import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { parse as parseYaml } from "yaml";
import { extractModel } from "../custom/lib/ast.mjs";
import { BUILTIN_ACTIONS, splitRule, policyIndex } from "../custom/lib/rules.mjs";

const root = path.resolve(import.meta.dirname, "..");
const read = file => fs.readFileSync(path.join(root,file),"utf8");
const snapshot = JSON.parse(read(".build/snapshot.json"));
const manifest = snapshot.manifest;
const report = JSON.parse(read(manifest.report));
const upstream = extractModel(snapshot.upstream, manifest);
const ss = (name, extra={}) => ({name,type:"ss",server:"node.example.com",port:443,cipher:"aes-128-gcm",password:"fixture-password",...extra});
const fixture = {proxies:[ss("日本 01"),ss("日本 01",{server:"duplicate.example.com"}),ss("香港 01"),ss("新加坡 01"),ss("美国 01",{"dialer-proxy":"日本 01"}),ss("韩国 01"),ss("日本 0.5x"),ss("官网 剩余流量")],dns:{},hosts:{}};
const outputFile=process.argv[2]||path.join(root,".build/mihomo-fixture.json");
const inputFile=path.join(root,".build/import.input.json"), profile=snapshot.lock.validation.bettbox;
fs.writeFileSync(inputFile,JSON.stringify(fixture));
const engine=spawnSync(process.env.BETTBOX_RUNNER,[path.join(root,manifest.output),inputFile,outputFile,
  String(profile.memory_limit),String(profile.stack_limit),String(profile.timeout_seconds)],{encoding:"utf8"});
assert.equal(engine.status,0,"Bettbox engine execution failed\n"+engine.stderr);
const output=JSON.parse(fs.readFileSync(outputFile,"utf8"));
const providers=output["rule-providers"],groups=new Map(output["proxy-groups"].map(group=>[group.name,group]));
const outputRules=new Set(output.rules);
const upstreamRules=[
  ...upstream.services.flatMap(service=>service.rules||[]),
  ...upstream.baseRules.flatMap(entry=>entry.rules),
];
const services=new Map(upstream.services.map(service=>[service.name,service]));
for(const rule of upstreamRules) {
  const records=report.rule_coverage.filter(record=>record.source===rule);
  assert.ok(records.length,"upstream rule has no disposition: "+rule);
  for(const record of records) {
    if(record.origin==="service") {
      const service=services.get(record.service);
      assert.equal(record.status==="excluded",manifest.excluded_services.includes(service.name));
      if(record.status!=="excluded") {
        const parts=splitRule(rule),index=policyIndex(parts);
        const route=manifest.service_routing[service.name]||manifest.default_service_routing;
        if(parts[0].trim()!=="SUB-RULE"&&!BUILTIN_ACTIONS.has(parts[index].trim()))parts[index]=route.target;
        assert.deepEqual(record.outputs,[parts.join(",")],"service mapping: "+rule);
      }
    }
    if(record.status==="excluded") {
      assert.ok(["service-policy","spread-policy","rule-policy"].includes(record.reason));
    } else {
      assert.ok(record.outputs?.length,"adopted rule lacks output: "+rule);
      for(const item of record.outputs)assert.ok(outputRules.has(item),"upstream rule output missing: "+rule);
    }
  }
}

const expectedProviders={};
function applyOverride(value,url) {
  const result={...value};if(url!==undefined){result.url=url;delete result["path-in-bundle"];}return result;
}
for(const [name,value] of Object.entries(upstream.baseRuleProviders)) {
  if(manifest.excluded_base_rule_providers.includes(name))continue;
  const replacement=manifest.base_rule_provider_replacements[name],expected={...value};
  if(replacement)for(const key of ["url","path","path-in-bundle"]) {
    if(expected[key]!==undefined)expected[key]=expected[key].replace(replacement.from,replacement.to);
  }
  expectedProviders[replacement?.name||name]=applyOverride(expected,manifest.base_rule_provider_url_overrides[name]);
}
for(const service of upstream.services) {
  if(manifest.excluded_services.includes(service.name)||!service.rules?.length)continue;
  for(const [name,value] of Object.entries(service.providers||{}))expectedProviders[name]=applyOverride(value,manifest.service_provider_url_overrides[service.name]?.[name]);
}
for(const service of Object.values(manifest.additional_services)) {
  for(const [name, provider] of Object.entries(service.providers || {})) {
    const {upstream_asset, ...definition} = provider;
    if(upstream_asset !== undefined) definition.url = new URL(upstream_asset, upstream.ruleSetBaseUrl).href;
    expectedProviders[name] = definition;
  }
}
Object.assign(expectedProviders,manifest.additional_rule_providers);
assert.deepEqual(providers,expectedProviders,"provider definitions differ from upstream and explicit custom sources");

// Ordinary rule data must remain on Bett; only these reviewed providers use
// converter output. The source script itself is inherited from AIsouler/MyClash.
const customProviderAssets = {
  "geolocation-cn": "geolocation-cn.mrs", ai: "ai.mrs",
  porn: "porn.mrs", claude: "claude.yaml", "mcdn屏蔽": "mcdn-block.mrs",
};
let bettProviderCount = 0;
for (const [name, provider] of Object.entries(providers)) {
  const url = new URL(provider.url);
  if (Object.hasOwn(customProviderAssets, name)) {
    assert.equal(provider.url,
      "https://raw.githubusercontent.com/frostmage1250/proxy-rules-converter/main/dist/mihomo/" + customProviderAssets[name]);
  } else {
    assert.ok(
      (url.hostname === "raw.githubusercontent.com" && url.pathname.startsWith("/appshubcc/bett-rules/meta/")) ||
      url.pathname.startsWith("/gh/appshubcc/bett-rules@meta/"),
      "ordinary provider no longer comes from Bett: " + name + " " + provider.url
    );
    bettProviderCount++;
  }
}
assert.ok(!Object.hasOwn(providers, "bypass_japan"));
assert.ok(!Object.values(providers).some(provider => provider.url.includes("steam-cn-download")));
assert.ok(output.rules.includes("RULE-SET,porn,porn"));
console.log("Rule provenance verified: " + bettProviderCount + " Bett providers and " +
  Object.keys(customProviderAssets).length + " reviewed converter providers.");

const names=output.proxies.map(proxy=>proxy.name);
assert.deepEqual(names,["日本 01","香港 01","新加坡 01","美国 01","韩国 01","日本 0.5x","IPv4优先","IPv6优先"]);
assert.ok(output.proxies.every(proxy=>!("dialer-proxy" in proxy)));
assert.deepEqual(groups.get("GitHub").proxies,["Proxy","订阅","AI"]);
assert.deepEqual(groups.get("YouTube").proxies,["Proxy","香港","低倍率节点"]);
assert.deepEqual(groups.get("媒体").proxies,["Proxy","低倍率节点","香港"]);
assert.equal(groups.get("Apple Podcasts").proxies[0], "Proxy");
assert.equal(providers.apple.url, new URL("geosite/apple.mrs", upstream.ruleSetBaseUrl).href);
assert.equal(providers.apple_podcasts.url, new URL("geosite/apple-podcasts.mrs", upstream.ruleSetBaseUrl).href);
assert.equal(output.rules.filter(rule => rule === "RULE-SET,apple_podcasts,Apple Podcasts").length, 1);
assert.ok(output.rules.indexOf("RULE-SET,apple_podcasts,Apple Podcasts") < output.rules.indexOf("RULE-SET,apple_cn,Direct"));
assert.deepEqual(output.dns["nameserver-policy"]["rule-set:apple_podcasts"], output.dns.nameserver);
assert.equal(Object.keys(output.dns["nameserver-policy"])[0], "rule-set:apple_podcasts");
assert.deepEqual(groups.get("PikPak").proxies,["Proxy","Direct","低倍率节点","香港"]);
assert.deepEqual(groups.get("porn").proxies,["Proxy","新加坡","低倍率节点","美国"]);
assert.deepEqual(groups.get("EHentai").proxies,["Proxy","美国","新加坡","香港"]);
assert.ok(!groups.has("pron"));
const noIconGroups=new Set(["Claude","媒体","porn"]);
for(const group of groups.values()) {
  assert.equal(group.type,"select");assert.equal(group.interval,0);assert.equal(group.url,upstream.groupTestUrl);
  const sourceName=manifest.group_icon_sources[group.name]||group.name;
  const expectedIcon=noIconGroups.has(group.name)?undefined:upstream.icons[sourceName];
  assert.equal(group.icon,expectedIcon,"upstream icon: "+group.name);
}
assert.deepEqual(output.dns["nameserver-policy"]["rule-set:cn"],["system"]);
assert.deepEqual(output.dns["direct-nameserver"],["system"]);
assert.equal(output.hosts["services.googleapis.cn"],"services.googleapis.com");
assert.equal(output.dns["fake-ip-filter"].includes("rule-set:googlefcm"),false);
const realIpDomains=new Set(parseYaml(snapshot.repcz).real_ip_domains.map(domain=>domain.toLowerCase())
  .filter(domain=>!manifest.real_ip_domain_exclusions.includes(domain)));
for(const domain of realIpDomains)assert.ok(output.dns["fake-ip-filter"].includes(domain),"real-IP domain missing: "+domain);
for(const host of manifest.excluded_hosts)assert.equal(Object.hasOwn(output.hosts,host),false);
for(const [key,value]of Object.entries(manifest.global_overrides))assert.deepEqual(output[key],value);
for(const field of manifest.omitted_global_fields) {
  const keys=field.split("."),key=keys.pop(),parent=keys.reduce((value,name)=>value?.[name],output);
  assert.equal(Object.hasOwn(parent||{},key),false);
}
console.log("Bettbox rquickjs "+profile.rquickjs+" generated the configuration: "+groups.size+" groups, "+
  Object.keys(providers).length+" providers, "+output.rules.length+" rules; upstream coverage and retained policy verified.");
