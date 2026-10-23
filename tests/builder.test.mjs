import test from "node:test";
import assert from "node:assert/strict";
import { parseScript, indexDeclarations, dependencyClosure, freeNames, transformDns, extractModel, globalConfigFunction } from "../custom/lib/ast.mjs";
import { generate } from "astring";
import { retargetRule, ruleReferences, matchesRule, replaceProviderAsset, planRules } from "../custom/lib/rules.mjs";
import { selectDomains, render } from "../custom/build_mihomo_script.mjs";
import fs from "node:fs";
const manifest = JSON.parse(fs.readFileSync(new URL("../custom/customizations.json", import.meta.url), "utf8"));

test("AST matching accepts formatting and follows helper dependencies", () => {
  const ast = parseScript("const helper = (x) => x + 1; function getMatchedRegions(\n value\n)\n{ return helper(value); }");
  assert.deepEqual(dependencyClosure(indexDeclarations(ast), ["getMatchedRegions"]).map(item => item.name), ["helper", "getMatchedRegions"]);
});
test("local bindings and property labels stay outside global dependencies", () => {
  const names = freeNames(parseScript("function f(helper) { const local = {helper: helper}; return external(local); }"));
  assert.deepEqual([...names], ["external"]);
});
test("DNS changes target structured fields and remove multiline FCM conditions", () => {
  const fn = parseScript("function buildDnsAndHostsConfig(config) { const minimalModeEnabled = false; const dns = {\"fake-ip-filter\": [\"rule-set:private\", ...(minimalModeEnabled ? [] : [\"rule-set:googlefcm\"])], \"nameserver-policy\": {\"rule-set:cn\": [\"old\"]}}; const hosts = {\"+.mcdn.bilivideo.com\": [\"1.2.3.4\"]}; return {dns, hosts}; }").body[0];
  const source = generate(transformDns(fn, manifest, ["*.example.com"]));
  assert.match(source, /repczRealIpDomains/);
  assert.doesNotMatch(source, /googlefcm|minimalModeEnabled|mcdn\.bilivideo/);
  assert.match(source, /system/);
  assert.match(source, /services\.googleapis\.com/);
});
test("built-in actions and SUB-RULE targets preserve their semantics", () => {
  for (const target of ["DIRECT", "REJECT", "REJECT-DROP", "PASS"]) {
    const rule = "DOMAIN,example.com," + target;
    assert.equal(retargetRule(rule, "Proxy"), rule);
  }
  assert.equal(retargetRule("DOMAIN,example.com,Service", "Proxy"), "DOMAIN,example.com,Proxy");
  assert.equal(retargetRule("RULE-SET,ranges,Service,no-resolve", "Proxy"), "RULE-SET,ranges,Proxy,no-resolve");
});
test("logical rule references preserve nested conditions", () => {
  const rule = "AND,((RULE-SET,ranges),(NOT,((OR,((RULE-SET,domains),(NETWORK,TCP)))))),Service";
  assert.deepEqual(ruleReferences(rule), ["ranges", "domains"]);
  assert.equal(retargetRule(rule, "Proxy"), rule.slice(0, -"Service".length) + "Proxy");
  assert.deepEqual(ruleReferences("DOMAIN-REGEX,^RULE-SET.*,Proxy"), []);
});
test("structured exclusions survive policy and flag changes", () => {
  assert.equal(matchesRule("RULE-SET,epicgames,New Group,no-resolve", {type:"RULE-SET",value:"epicgames"}), true);
  assert.equal(matchesRule("DOMAIN,fsend.cn,DIRECT", {type:"DOMAIN",value:"fsend.cn"}), true);
});
test("explicit asset replacement preserves URL parameters, CDN, and declared format", () => {
  const value = replaceProviderAsset({type:"http",behavior:"domain",format:"yaml",
    url:"https://cdn.example/r/category-games@cn.yaml?version=2#asset",path:"./cache/category-games@cn.yaml"},
    {from:"category-games@cn",to:"steam@cn"});
  assert.equal(value.url, "https://cdn.example/r/steam@cn.yaml?version=2#asset");
  assert.equal(value.path, "./cache/steam@cn.yaml");
  assert.equal(value.format, "yaml");
});
test("standard YAML parser handles inline lists and more than 1000 domains", () => {
  assert.deepEqual(selectDomains("real_ip_domains: ['Example.COM', '*.example.com']", []).applied, ["example.com","*.example.com"]);
  const domains = Array.from({length:1001}, (_,i) => "host" + i + ".example.com");
  assert.equal(selectDomains("real_ip_domains: " + JSON.stringify(domains), []).applied.length, 1001);
});
test("real-IP selection retains explicit exclusions and validates wildcards", () => {
  assert.deepEqual(selectDomains("real_ip_domains: ['*.example.com','*-update.xoyocdn.com']", manifest.real_ip_domain_exclusions).excluded, ["*-update.xoyocdn.com"]);
  assert.throws(() => selectDomains("real_ip_domains: ['bad*.example.com']", []), /wildcard/);
});
test("new service names follow the default route and stale preferences are reported", () => {
  const local = {...manifest, additional_services:{}, additional_rule_providers:{},
    excluded_base_rule_providers:[], excluded_services:[], excluded_rules:[], custom_rules:{final:["MATCH,Final"]},
    service_provider_url_overrides:{},base_rule_provider_url_overrides:{},base_rule_provider_replacements:{},
    service_routing:{OldName:{target:"AI",section:"before_direct",order:1}}};
  const model = {services:[{name:"NewName",providers:{},rules:["PROCESS-NAME,app,NewName","DOMAIN,ads.example.com,REJECT"]}],
    baseRuleProviders:{},baseRules:[]};
  const result = planRules(model, local);
  assert.deepEqual(result.rules, ["PROCESS-NAME,app,Proxy","DOMAIN,ads.example.com,REJECT","MATCH,Final"]);
  assert.deepEqual(result.stale, ["service-routing:OldName"]);
});
test("missing references and actual provider conflicts stop publication", () => {
  const local = {...manifest, additional_services:{},additional_rule_providers:{},excluded_services:[],
    excluded_base_rule_providers:[], service_provider_url_overrides:{},base_rule_provider_url_overrides:{},
    base_rule_provider_replacements:{},service_routing:{},custom_rules:{final:["MATCH,Final"]}};
  assert.throws(() => planRules({services:[{name:"New",providers:{},rules:["RULE-SET,missing,New"]}],baseRuleProviders:{},baseRules:[]}, local), /Missing provider/);
  const provider = {type:"http",behavior:"domain",url:"https://one.example/rules"};
  assert.throws(() => planRules({services:[{name:"New",providers:{same:{...provider,url:"https://two.example/rules"}},rules:["RULE-SET,same,New"]}],baseRuleProviders:{same:provider},baseRules:[]}, local), /conflict/);
});
test("global configuration inherits new fields while retaining declared overrides", () => {
  const main = parseScript("function main(config) { const newConfig={}; newConfig['allow-lan']=true; newConfig['new-field']=42; newConfig['tun']={stack:'system','auto-redirect':true,'future-option':true}; return newConfig; }").body[0];
  const source = generate(globalConfigFunction({main}, manifest));
  const value = new Function(source + ";return buildGlobalConfig({});")();
  assert.equal(value["allow-lan"], false);
  assert.equal(value["new-field"], 42);
  assert.equal(value.tun["future-option"], true);
  assert.equal(Object.hasOwn(value.tun,"auto-redirect"), false);
});
test("main rules are extracted from declaration order, independent of sample nodes", () => {
  const source = fs.readFileSync(new URL("../Script/mihomoScript.js",import.meta.url),"utf8");
  const marker = "'RULE-SET,geolocation-!cn,默认代理'";
  const changed = source.replace(marker, "'DOMAIN,new-global.example.com,默认代理',\n" + marker);
  const model = extractModel(changed,manifest);
  assert.equal(model.baseRules.some(entry => entry.rules.includes("DOMAIN,new-global.example.com,默认代理") && entry.position==="after_services"),true);
  assert.equal(model.icons["其他节点"],model.evaluate(parseScript("iconBaseUrl + 'WorldMap.svg'").body[0].expression));
});
test("fixed snapshot renders without a published file or network request", () => {
  const snapshot = JSON.parse(fs.readFileSync(new URL("../.build/snapshot.json",import.meta.url),"utf8"));
  const first = render(snapshot), second = render(snapshot);
  assert.deepEqual(first,second);
  const changed = structuredClone(snapshot);
  changed.upstream += "\n";
  assert.throws(() => render(changed), /digest/);
});
