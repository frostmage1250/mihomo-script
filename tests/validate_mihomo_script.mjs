import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { parse as parseYaml } from "yaml";
import { sha256 } from "../custom/snapshot.mjs";
import { BUILTIN_ACTIONS, splitRule, policyIndex } from "../custom/lib/rules.mjs";

const root = path.resolve(import.meta.dirname, "..");
const read = file => fs.readFileSync(path.join(root,file),"utf8");
const snapshot = JSON.parse(read(".build/snapshot.json"));
const manifest = snapshot.manifest;
const source = read("mihomoScript.js"), report = JSON.parse(read(manifest.report));
const upstream = new Function(snapshot.upstream +
  "\nreturn {main,serviceConfigs,baseRuleProviders,groupBaseOption};")();
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
const outputRules=new Set(output.rules),original=upstream.main(JSON.parse(JSON.stringify(fixture)));
assert.equal(sha256(source),report.output_sha256);

const services=new Map(upstream.serviceConfigs.map(service=>[service.name,service]));
for(const rule of original.rules) {
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
for(const service of upstream.serviceConfigs) {
  if(manifest.excluded_services.includes(service.name)||!service.rules?.length)continue;
  for(const [name,value] of Object.entries(service.providers||{}))expectedProviders[name]=applyOverride(value,manifest.service_provider_url_overrides[service.name]?.[name]);
}
for(const service of Object.values(manifest.additional_services))Object.assign(expectedProviders,service.providers);
Object.assign(expectedProviders,manifest.additional_rule_providers);
assert.deepEqual(providers,expectedProviders,"provider definitions differ from upstream and explicit custom sources");

const names=output.proxies.map(proxy=>proxy.name);
assert.deepEqual(names,["日本 01","香港 01","新加坡 01","美国 01","韩国 01","日本 0.5x","IPv4优先","IPv6优先"]);
assert.ok(output.proxies.every(proxy=>!("dialer-proxy" in proxy)));
assert.deepEqual(groups.get("GitHub").proxies,["Proxy","订阅","AI"]);
assert.deepEqual(groups.get("YouTube").proxies,["Proxy","香港","低倍率节点"]);
assert.deepEqual(groups.get("媒体").proxies,["Proxy","低倍率节点","香港"]);
assert.deepEqual(groups.get("PikPak").proxies,["Proxy","Direct","低倍率节点","香港"]);
assert.deepEqual(groups.get("pron").proxies,["Proxy","香港","新加坡"]);
const allowed=new Set([...BUILTIN_ACTIONS,...names,...groups.keys()]);
for(const group of groups.values()) {
  assert.equal(group.type,"select");assert.equal(group.interval,0);assert.equal(group.url,upstream.groupBaseOption.url);
  for(const name of group.proxies)assert.ok(allowed.has(name),"group reference: "+name);
  assert.equal(group.icon,report.applied_group_icons[group.name]);
}
for(const name of ["Claude","媒体","pron"])assert.equal(Object.hasOwn(groups.get(name),"icon"),false);
for(const rule of output.rules) {
  const parts=splitRule(rule);
  if(parts[0].trim()!=="SUB-RULE")assert.ok(allowed.has(parts[policyIndex(parts)]),"rule target: "+rule);
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
