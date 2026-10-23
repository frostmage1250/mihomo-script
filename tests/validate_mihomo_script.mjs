import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { parse } from "acorn";
import { sha256 } from "../custom/snapshot.mjs";

const root = path.resolve(import.meta.dirname, "..");
const read = file => fs.readFileSync(path.join(root,file),"utf8");
const source = read("mihomoScript.js"), native = read("Script/mihomoScript.js");
const manifest = JSON.parse(read("custom/customizations.json"));
const report = JSON.parse(read("custom/upstream.json"));
const snapshot = JSON.parse(read(".build/snapshot.json"));
const plain = value => JSON.parse(JSON.stringify(value));
parse(source,{ecmaVersion:manifest.client_compatibility.ecma_version});
const load = (text, options={}) => new Function(text +
  "\nObject.assign(ruleOptionsEnable," + JSON.stringify(options) + ");return {main,regionDefinitions,ruleOptionsEnable};")();
const runtime = load(source);
const upstream = new Function(native + "\nreturn {main,serviceConfigs,baseRuleProviders,regionDefinitions,rateRegionDefinitions,groupBaseOption};")();
const ss = (name, extra={}) => ({name,type:"ss",server:"node.example.com",port:443,cipher:"aes-128-gcm",password:"fixture-password",...extra});
const fixture = {proxies:[ss("日本 01"),ss("日本 01",{server:"duplicate.example.com"}),ss("香港 01"),ss("新加坡 01"),ss("美国 01",{"dialer-proxy":"日本 01"}),ss("韩国 01"),ss("日本 0.5x"),ss("官网 剩余流量")],dns:{},hosts:{}};
const output = runtime.main(plain(fixture));
const providers = output["rule-providers"], groups = new Map(output["proxy-groups"].map(group=>[group.name,group]));
const original = upstream.main(plain(fixture));
assert.equal(sha256(source),report.output_sha256);
assert.equal(sha256(native),snapshot.lock.upstream.sha256);
assert.deepEqual(JSON.parse(read("custom/sources.lock.json")),snapshot.lock);
assert.deepEqual(plain(runtime.regionDefinitions.map(({name,regex})=>({name,regex:String(regex)}))),
  plain(upstream.regionDefinitions.map(({name,regex})=>({name,regex:String(regex)}))));
assert.equal(report.rule_coverage.length > 0,true);
for (const rule of original.rules) {
  const records = report.rule_coverage.filter(record=>record.source===rule);
  assert.equal(records.length > 0,true,"upstream rule has no disposition: "+rule);
  for(const record of records) {
    if(record.status==="excluded") {
      assert.equal(["service-policy","spread-policy","rule-policy"].includes(record.reason),true);
    } else {
      assert.equal(record.outputs?.length > 0,true,"adopted rule lacks output: "+rule);
      for(const item of record.outputs) assert.equal(output.rules.includes(item),true,"upstream rule output missing: "+rule);
    }
  }
}
const expectedProviders = {};
function applyOverride(value,url) {
  const result={...value}; if(url!==undefined){result.url=url;delete result["path-in-bundle"];} return result;
}
for(const [name,value] of Object.entries(upstream.baseRuleProviders)) {
  if(manifest.excluded_base_rule_providers.includes(name))continue;
  const replacement=manifest.base_rule_provider_replacements[name], expected={...value};
  if(replacement)for(const key of ["url","path","path-in-bundle"]) {
    if(expected[key]!==undefined)expected[key]=expected[key].replace(replacement.from,replacement.to);
  }
  expectedProviders[replacement?.name||name]=applyOverride(expected,manifest.base_rule_provider_url_overrides[name]);
}
for(const service of upstream.serviceConfigs) {
  if(manifest.excluded_services.includes(service.name)||!service.rules?.length)continue;
  for(const [name,value] of Object.entries(service.providers||{}))expectedProviders[name]=applyOverride(value,manifest.service_provider_url_overrides[service.name]?.[name]);
  const route=manifest.service_routing[service.name]||manifest.default_service_routing;
  for(const rule of service.rules) {
    const match=/,([^,()]+)((?:,(?:no-resolve|src|dst|extended-matching))*)$/.exec(rule);
    assert.ok(match,"service policy: "+rule);
    const action=match[1],expected=["DIRECT","REJECT","REJECT-DROP","PASS","COMPATIBLE"].includes(action)
      ?rule:rule.slice(0,match.index)+","+route.target+match[2];
    assert.equal(output.rules.includes(expected),true,"service rule mapping differs: "+rule);
  }
}
for(const service of Object.values(manifest.additional_services))Object.assign(expectedProviders,service.providers);
Object.assign(expectedProviders,manifest.additional_rule_providers);
assert.deepEqual(plain(providers),plain(expectedProviders),"provider definitions differ from independent sources and manifest");
const names=output.proxies.map(proxy=>proxy.name);
assert.deepEqual(names,["日本 01","香港 01","新加坡 01","美国 01","韩国 01","日本 0.5x","IPv4优先","IPv6优先"]);
assert.equal(output.proxies.every(proxy=>!("dialer-proxy" in proxy)),true);
assert.deepEqual(groups.get("GitHub").proxies,["Proxy","订阅","AI"]);
assert.deepEqual(groups.get("YouTube").proxies,["Proxy","香港","低倍率节点"]);
assert.deepEqual(groups.get("媒体").proxies,["Proxy","低倍率节点","香港"]);
assert.deepEqual(groups.get("PikPak").proxies,["Proxy","Direct","低倍率节点","香港"]);
assert.deepEqual(groups.get("pron").proxies,["Proxy","香港","新加坡"]);
const allowed=new Set(["DIRECT","REJECT","REJECT-DROP","PASS",...names,...groups.keys()]);
for(const group of groups.values()) {
  assert.equal(group.type,"select");assert.equal(group.interval,0);assert.equal(group.url,upstream.groupBaseOption.url);
  for(const name of group.proxies)assert.equal(allowed.has(name),true,"group reference: "+name);
  assert.equal(group.icon,report.applied_group_icons[group.name]);
}
for(const name of ["Claude","媒体","pron"])assert.equal(Object.hasOwn(groups.get(name),"icon"),false);
for(const rule of output.rules) {
  const match=/,([^,()]+)((?:,(?:no-resolve|src|dst|extended-matching))*)$/.exec(rule);
  assert.equal(allowed.has(match[1]),true,"rule target: "+rule);
}
assert.equal(new Set(output.rules).size,output.rules.length);
assert.deepEqual(output.dns["nameserver-policy"]["rule-set:cn"],["system"]);
assert.deepEqual(output.dns["direct-nameserver"],["system"]);
assert.equal(output.hosts["services.googleapis.cn"],"services.googleapis.com");
assert.equal(output.dns["fake-ip-filter"].includes("rule-set:googlefcm"),false);
for(const domain of report.real_ip_domains_upstream.applied_domains)assert.equal(output.dns["fake-ip-filter"].includes(domain),true);
for(const host of manifest.excluded_hosts)assert.equal(Object.hasOwn(output.hosts,host),false);
for(const [key,value]of Object.entries(manifest.global_overrides))assert.deepEqual(output[key],value);
assert.equal(Object.hasOwn(output,"ntp"),false);assert.equal(Object.hasOwn(output,"bind-address"),false);
assert.equal(Object.hasOwn(output.tun,"auto-redirect"),false);
const zw=name=>[...name].join("\u200B");
const cases=[
  {name:"normal",input:fixture,options:{}},
  {name:"invisible",input:{proxies:[ss(zw("HK 01")),ss("\u3164SG\uFFA0 03"),ss(zw("TW 01")),ss(zw("日本 0.3x")),ss(zw("官网公告"))],dns:{},hosts:{}},options:{}},
  {name:"low-rate-filter",input:{proxies:[ss("香港 01"),ss(zw("日本 0.3x"))],dns:{},hosts:{}},options:{"过滤低倍率节点":true}},
  {name:"private-dns",input:{proxies:[ss("日本 01")],dns:{nameserver:["https://private.example/dns-query#Proxy"],"proxy-server-nameserver":["tls://private.example#DIRECT"],"nameserver-policy":{"+.example.com":["tls://private.example#DIRECT"]}},hosts:{}},options:{}},
  {name:"hosts-rewrite",input:{proxies:[ss("日本 01")],dns:{"proxy-server-nameserver":["127.0.0.1"],listen:"0.0.0.0:53"},hosts:{"node.example.com":"mapped.example.net"}},options:{}}
];
let baseline,baselineReport;
try { baseline=fs.readFileSync(process.env.BASELINE_SCRIPT,"utf8");baselineReport=JSON.parse(fs.readFileSync(process.env.BASELINE_REPORT,"utf8")); }catch(error){if(process.env.BASELINE_SCRIPT)throw error;}
for(const item of cases) {
  const actual=load(source,item.options).main(plain(item.input));
  if(baseline&&baselineReport.fork.source_sha256===snapshot.lock.upstream.sha256) {
    const expected=load(baseline,item.options).main(plain(item.input));
    const patterns=new Set([...baselineReport.real_ip_domains_upstream.applied_domains,...report.real_ip_domains_upstream.applied_domains]);
    for(const value of [actual,expected]) value.dns["fake-ip-filter"]=value.dns["fake-ip-filter"].filter(pattern=>!patterns.has(pattern));
    assert.deepEqual(actual,expected,"preserved behavior differs: "+item.name);
  }
  if(process.env.BETTBOX_RUNNER) {
    const inputFile=path.join(root,".build",item.name+".input.json"),outputFile=path.join(root,".build",item.name+".quickjs.json");
    fs.writeFileSync(inputFile,JSON.stringify(item.input));
    const result=spawnSync(process.env.BETTBOX_RUNNER,[path.join(root,"mihomoScript.js"),inputFile,outputFile,JSON.stringify(item.options)],{encoding:"utf8"});
    assert.equal(result.status,0,"Bettbox engine failed: "+item.name+"\n"+result.stderr);
    const nativeResult=load(source,item.options).main(plain(item.input));
    assert.deepEqual(JSON.parse(fs.readFileSync(outputFile,"utf8")),nativeResult,"Bettbox/Node results differ: "+item.name);
  }
}
const unsupportedContext=vm.createContext({});
vm.runInContext("Array.prototype.at=undefined;Object.hasOwn=undefined;globalThis.structuredClone=undefined;",unsupportedContext);
const compatible=vm.runInContext("(function(config){"+source+"\nreturn main(config);})",unsupportedContext);
assert.equal(compatible(plain(fixture)).rules.length,output.rules.length);
fs.writeFileSync(process.argv[2]||path.join(root,".build/mihomo-fixture.json"),JSON.stringify(output,null,2)+"\n");
console.log("Validated "+groups.size+" groups, "+Object.keys(providers).length+" providers, "+output.rules.length+" rules; "+cases.length+" Bettbox compatibility/preservation cases.");
