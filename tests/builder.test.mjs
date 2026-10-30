import test from "node:test";
import assert from "node:assert/strict";
import { parseScript, indexDeclarations, dependencyClosure, freeNames, transformDns, extractModel, globalConfigFunction, compileScript } from "../custom/lib/ast.mjs";
import { generate } from "astring";
import { retargetRule, matchesRule, replaceProviderAsset, planRules } from "../custom/lib/rules.mjs";
import fs from "node:fs";
import vm from "node:vm";
const manifest = JSON.parse(fs.readFileSync(new URL("../custom/customizations.json", import.meta.url), "utf8"));

test("AST matching accepts formatting and follows helper dependencies", () => {
  const ast = parseScript("const helper = (x) => x + 1; function getMatchedRegions(\n value\n)\n{ return helper(value); }");
  assert.deepEqual(dependencyClosure(indexDeclarations(ast), ["getMatchedRegions"]).map(item => item.name), ["helper", "getMatchedRegions"]);
});
test("local bindings and property labels stay outside global dependencies", () => {
  const names = freeNames(parseScript("function f(helper) { const local = {helper: helper}; return external(local); }"));
  assert.deepEqual([...names], ["external"]);
});
test("DNS changes preserve upstream Fake-IP expressions and FCM conditions", () => {
  const fn = parseScript("function buildDnsAndHostsConfig(config) { const minimalModeEnabled = false; const dns = {\"fake-ip-filter\": [\"rule-set:private\", ...(minimalModeEnabled ? [] : [\"rule-set:googlefcm\"])], \"nameserver-policy\": {\"rule-set:cn\": [\"old\"]}}; const hosts = {\"+.mcdn.bilivideo.com\": [\"1.2.3.4\"]}; return {dns, hosts}; }").body[0];
  const source = generate(transformDns(fn, manifest));
  assert.match(source, /googlefcm/);
  assert.match(source, /minimalModeEnabled/);
  assert.doesNotMatch(source, /repczRealIpDomains|mcdn\.bilivideo/);
  const original = fn.body.body[1].declarations[0].init.properties[0].value;
  const transformed = transformDns(fn, manifest).body.body[1].declarations[0].init.properties[0].value;
  assert.equal(generate(transformed), generate(original));
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
test("logical rule policies preserve nested conditions", () => {
  const rule = "AND,((RULE-SET,ranges),(NOT,((OR,((RULE-SET,domains),(NETWORK,TCP)))))),Service";
  assert.equal(retargetRule(rule, "Proxy"), rule.slice(0, -"Service".length) + "Proxy");
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
test("actual provider conflicts stop publication", () => {
  const local = {...manifest, additional_services:{},additional_rule_providers:{},excluded_services:[],
    excluded_base_rule_providers:[], service_provider_url_overrides:{},base_rule_provider_url_overrides:{},
    base_rule_provider_replacements:{},service_routing:{},custom_rules:{final:["MATCH,Final"]}};
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

test("additional Bett services follow an upstream CDN change", () => {
  const local = {...manifest, additional_services: {"Apple Podcasts": manifest.additional_services["Apple Podcasts"]},
    additional_rule_providers:{}, excluded_base_rule_providers:[], excluded_services:[],
    service_provider_url_overrides:{}, base_rule_provider_url_overrides:{}, base_rule_provider_replacements:{},
    service_routing: {"Apple Podcasts": manifest.service_routing["Apple Podcasts"]},
    excluded_rules:[], custom_rules:{final:["MATCH,Final"]}};
  for (const base of ["https://cdn.jsdmirror.com/gh/appshubcc/bett-rules@meta/geo/",
    "https://new-mirror.example/gh/appshubcc/bett-rules@meta/geo/"]) {
    const model = {ruleSetBaseUrl:base, services:[], baseRuleProviders:{}, baseRules:[]};
    const result = planRules(model, local);
    assert.equal(result.providers.apple_podcasts.url, base + "geosite/apple-podcasts.mrs");
    assert.deepEqual(result.rules, ["RULE-SET,apple_podcasts,媒体", "MATCH,Final"]);
  }
});

test("DNS retains default foreign resolvers and shared direct-exit resolution", () => {
  const fn = parseScript('function buildDnsAndHostsConfig(config) { const dns = {"fake-ip-filter": [], nameserver: ["https://current-dns.example/dns-query#Proxy"], "nameserver-policy": {"rule-set:cn": ["old"]}}; const hosts = {}; return {dns, hosts}; }').body[0];
  const source = generate(transformDns(fn, manifest));
  const value = new Function(source + ";return buildDnsAndHostsConfig({});")();
  assert.equal(Object.hasOwn(value.dns["nameserver-policy"], "rule-set:apple_podcasts"), false);
  assert.deepEqual(value.dns.nameserver, ["https://current-dns.example/dns-query#Proxy"]);
  assert.deepEqual(value.dns["direct-nameserver"], ["system"]);
  assert.deepEqual(value.dns["nameserver-policy"]["rule-set:cn"], ["system"]);
});

test("foreign QUIC preserves upstream defaults, definitions, precedence and both switch states", () => {
  const original = fs.readFileSync(new URL("../Script/mihomoScript.js", import.meta.url), "utf8");
  const runtime = fs.readFileSync(new URL("../custom/runtime.js", import.meta.url), "utf8");
  const fixture = {proxies: [{name:"日本 01",type:"ss",server:"node.example.com",port:443,
    cipher:"aes-128-gcm",password:"fixture-password"}],dns:{},hosts:{}};
  // A changed upstream default and expression must propagate through generation.
  const variants = [
    original,
    original.replace("屏蔽国外QUIC: true", "屏蔽国外QUIC: false")
      .replace("(DST-PORT,443)", "(DST-PORT,8443)"),
  ];
  for (const source of variants) {
    const model = extractModel(source, manifest);
    const plan = planRules(model, manifest);
    const compiled = compileScript(model, manifest, plan, runtime, {commit:"test"}).script;
    const context = vm.createContext({});
    vm.runInContext(compiled + "\n" +
      "globalThis.run = main; globalThis.setQuic = value => {ruleOptionsEnable.屏蔽国外QUIC = value;};" +
      "globalThis.defaultQuic = ruleOptionsEnable.屏蔽国外QUIC;" +
      "globalThis.quicRules = blockForeignQuic;", context);
    assert.equal(context.defaultQuic, model.nativeOptions.屏蔽国外QUIC);
    const nativeQuic = JSON.parse(JSON.stringify(model.evaluate(parseScript("blockForeignQuic").body[0].expression)));
    assert.deepEqual(JSON.parse(JSON.stringify(context.quicRules)), nativeQuic);
    const upstreamContext = vm.createContext({});
    vm.runInContext(source +
      "\n globalThis.run = main; globalThis.setQuic = value => {ruleOptionsEnable.屏蔽国外QUIC = value;};",
      upstreamContext);
    const snapshot = () => JSON.parse(JSON.stringify(context.run(fixture)));
    const initial = snapshot();
    for (const enabled of [true, false, true]) {
      context.setQuic(enabled);
      upstreamContext.setQuic(enabled);
      const output = snapshot();
      const nativeOutput = JSON.parse(JSON.stringify(upstreamContext.run(fixture)));
      assert.equal(Object.hasOwn(output["rule-providers"], "cn_additional"), enabled);
      if (enabled) {
        assert.deepEqual(output["rule-providers"].cn_additional, nativeOutput["rule-providers"].cn_additional);
        const prefix = JSON.parse(JSON.stringify(model.evaluate(parseScript("prefixRules").body[0].expression)))
          .filter(rule => !manifest.excluded_rules.some(selector => matchesRule(rule, selector)))
          .map(rule => {
            const parts = rule.split(",");
            if (parts[0] === "RULE-SET") parts[1] = manifest.base_rule_provider_replacements[parts[1]]?.name || parts[1];
            const index = parts.length - 1;
            parts[index] = manifest.policy_aliases[parts[index]] || parts[index];
            return parts.join(",");
          });
        assert.deepEqual(output.rules.slice(0, prefix.length), prefix);
        assert.deepEqual(output.rules.slice(prefix.length, prefix.length + nativeQuic.length), nativeQuic);
      }
      for (const rule of nativeQuic) {
        assert.equal(output.rules.filter(value => value === rule).length, enabled ? 1 : 0);
        assert.equal(nativeOutput.rules.includes(rule), enabled);
      }
      assert.equal(new Set(output.rules).size, output.rules.length);
      const stripQuic = value => value.rules.filter(rule => !nativeQuic.includes(rule));
      assert.deepEqual(stripQuic(output), stripQuic(initial));
      const baselineProviders = {...initial["rule-providers"]};
      const actualProviders = {...output["rule-providers"]};
      delete baselineProviders.cn_additional;
      delete actualProviders.cn_additional;
      assert.deepEqual(actualProviders, baselineProviders);
    }
  }
});
