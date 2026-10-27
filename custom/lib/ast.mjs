import { parse } from "acorn";
import { generate } from "astring";
import vm from "node:vm";

export const parseScript = source => parse(source, {ecmaVersion: "latest", sourceType: "script"});
export const expression = source => parseScript("(" + source + ")").body[0].expression;
export const literal = value => expression(JSON.stringify(value));
export const clone = node => structuredClone(node);

export function keyOf(node) {
  const key = node.type === "MemberExpression" ? node.property : node.key;
  if (!key) return undefined;
  if (key.type === "Literal") return String(key.value);
  if (!node.computed && key.type === "Identifier") return key.name;
  return undefined;
}

export function walk(node, visitor) {
  if (!node || typeof node !== "object") return;
  if (node.type) visitor(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) if (child?.type) walk(child, visitor);
    } else if (value?.type) walk(value, visitor);
  }
}

// Scope-aware dependency collection; property labels and locally bound names stay local.
function bindings(pattern, result) {
  if (!pattern) return;
  if (pattern.type === "Identifier") result.add(pattern.name);
  else if (pattern.type === "RestElement") bindings(pattern.argument, result);
  else if (pattern.type === "AssignmentPattern") bindings(pattern.left, result);
  else if (pattern.type === "ArrayPattern") for (const item of pattern.elements) bindings(item, result);
  else if (pattern.type === "ObjectPattern") for (const item of pattern.properties) bindings(item.value || item.argument, result);
}

function blockBindings(body) {
  const names = new Set();
  for (const node of body) {
    if (node.type === "VariableDeclaration") for (const item of node.declarations) bindings(item.id, names);
    else if (node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") if (node.id) names.add(node.id.name);
  }
  return names;
}

export function freeNames(root) {
  const free = new Set();
  const isBound = (name, scopes) => scopes.some(scope => scope.has(name));
  function visit(node, scopes) {
    if (!node?.type) return;
    if (node.type === "Identifier") { if (!isBound(node.name, scopes)) free.add(node.name); return; }
    if (node.type === "Program" || node.type === "BlockStatement") {
      const nested = [...scopes, blockBindings(node.body)];
      for (const item of node.body) visit(item, nested);
      return;
    }
    if (["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(node.type)) {
      const local = new Set();
      if (node.id) local.add(node.id.name);
      for (const param of node.params) bindings(param, local);
      const nested = [...scopes, local];
      for (const param of node.params) if (param.type === "AssignmentPattern") visit(param.right, nested);
      visit(node.body, nested);
      return;
    }
    if (node.type === "VariableDeclaration") {
      for (const item of node.declarations) visit(item.init, scopes);
      return;
    }
    if (node.type === "MemberExpression") {
      visit(node.object, scopes);
      if (node.computed) visit(node.property, scopes);
      return;
    }
    if (node.type === "Property") {
      if (node.computed) visit(node.key, scopes);
      visit(node.value, scopes);
      return;
    }
    if (node.type === "ForOfStatement" || node.type === "ForInStatement" || node.type === "ForStatement") {
      const local = new Set(), declaration = node.left || node.init;
      if (declaration?.type === "VariableDeclaration") for (const item of declaration.declarations) bindings(item.id, local);
      const nested = [...scopes, local];
      for (const key of ["left", "right", "init", "test", "update", "body"]) visit(node[key], nested);
      return;
    }
    if (node.type === "CatchClause") {
      const local = new Set(); bindings(node.param, local); visit(node.body, [...scopes, local]); return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (["id", "label", "key", "property"].includes(key)) continue;
      if (Array.isArray(value)) for (const child of value) visit(child, scopes);
      else if (value?.type) visit(value, scopes);
    }
  }
  visit(root, []);
  return free;
}

export function indexDeclarations(ast) {
  const index = new Map();
  let order = 0;
  for (const statement of ast.body) {
    if (statement.type === "VariableDeclaration") {
      for (const item of statement.declarations) {
        if (item.id.type !== "Identifier") continue;
        if (index.has(item.id.name)) throw new Error("Duplicate top-level declaration: " + item.id.name);
        index.set(item.id.name, {node: {...statement, declarations: [item]}, order: order++});
      }
    } else if (statement.type === "FunctionDeclaration" && statement.id) {
      index.set(statement.id.name, {node: statement, order: order++});
    }
  }
  return index;
}

export function dependencyClosure(index, roots) {
  const chosen = new Set();
  function include(name) {
    if (chosen.has(name) || !index.has(name)) return;
    chosen.add(name);
    for (const dependency of freeNames(index.get(name).node)) if (dependency !== name) include(dependency);
  }
  for (const name of roots) include(name);
  return [...chosen].map(name => ({name, ...index.get(name)})).sort((a, b) => a.order - b.order);
}

function objectVariable(fn, name) {
  let object;
  walk(fn.body, node => {
    if (node.type === "VariableDeclarator" && node.id.type === "Identifier" &&
        node.id.name === name && node.init?.type === "ObjectExpression") object = node.init;
  });
  if (!object) throw new Error("Expected upstream object binding: " + name);
  return object;
}

function property(object, key) { return object.properties.find(item => item.type === "Property" && keyOf(item) === key); }
export function put(object, key, value) {
  const found = property(object, key);
  if (found) found.value = value;
  else object.properties.push({type: "Property", key: literal(key), value, kind: "init", method: false, shorthand: false, computed: false});
}

function hasLiteral(node, value) {
  let found = false;
  walk(node, child => { if (child.type === "Literal" && child.value === value) found = true; });
  return found;
}

export function transformDns(fn, manifest, domains) {
  const result = clone(fn), dns = objectVariable(result, "dns"), hosts = objectVariable(result, "hosts");
  const filter = property(dns, "fake-ip-filter");
  if (filter?.value.type !== "ArrayExpression") throw new Error("Expected upstream fake-IP filter array");
  filter.value.elements = [
    {type: "SpreadElement", argument: {type: "Identifier", name: "repczRealIpDomains"}},
    ...filter.value.elements.filter(item => !manifest.excluded_fake_ip_filters.some(value => hasLiteral(item, value))),
  ];
  for (const [key, value] of Object.entries(manifest.dns_overrides)) put(dns, key, literal(value));
  const policy = property(dns, "nameserver-policy");
  if (policy?.value.type !== "ObjectExpression") throw new Error("Expected upstream nameserver policy object");
  for (const [key, value] of Object.entries(manifest.dns_policy_overrides)) put(policy.value, key, literal(value));
  const inherited = Object.entries(manifest.dns_policy_inherit || {}).map(([key, field]) => {
    const source = property(dns, field);
    if (!source) throw new Error("Missing upstream DNS field: " + field);
    return {type: "Property", key: literal(key), value: clone(source.value), kind: "init", method: false, shorthand: false, computed: false};
  });
  const inheritedKeys = new Set(Object.keys(manifest.dns_policy_inherit || {}));
  policy.value.properties = [...inherited, ...policy.value.properties.filter(item => !inheritedKeys.has(keyOf(item)))];
  hosts.properties = hosts.properties.filter(item => !manifest.excluded_hosts.includes(keyOf(item)));
  for (const [key, value] of Object.entries(manifest.host_overrides)) put(hosts, key, literal(value));
  result.body.body = result.body.body.filter(statement => {
    if (statement.type !== "VariableDeclaration" || statement.declarations.length !== 1) return true;
    const item = statement.declarations[0];
    return item.id.name !== "minimalModeEnabled" || freeNames({...result, body: {
      ...result.body, body: result.body.body.filter(value => value !== statement),
    }}).has("minimalModeEnabled");
  });
  return result;
}

function assignments(main) {
  const entries = [];
  for (const statement of main.body.body) {
    const value = statement.type === "ExpressionStatement" ? statement.expression : null;
    if (value?.type === "AssignmentExpression" && value.operator === "=" &&
        value.left.type === "MemberExpression" && keyOf(value.left)) {
      entries.push({key: keyOf(value.left), value: value.right});
    }
  }
  return entries;
}

export function extractModel(source, manifest) {
  const ast = parseScript(source), index = indexDeclarations(ast);
  const context = vm.createContext({});
  new vm.Script(source).runInContext(context, {timeout: 3000});
  const evaluate = node => new vm.Script("(" + generate(node) + ")").runInContext(context, {timeout: 3000});
  const read = name => {
    if (!index.has(name)) throw new Error("Missing upstream declaration: " + name);
    return vm.runInContext(name, context, {timeout: 3000});
  };
  const main = index.get("main")?.node;
  if (main?.type !== "FunctionDeclaration") throw new Error("Missing upstream main function");
  const ruleExpression = assignments(main).find(entry => entry.key === "rules")?.value;
  if (ruleExpression?.type !== "ArrayExpression") throw new Error("Expected upstream main rule array");
  let position = "before_services";
  const baseRules = [];
  for (let i = 0; i < ruleExpression.elements.length; i++) {
    const node = ruleExpression.elements[i];
    if (node.type === "SpreadElement" && node.argument.type === "Identifier" && node.argument.name === "functionalRules") {
      position = "after_services"; continue;
    }
    const value = node.type === "SpreadElement" ? node.argument : node;
    const dependencies = [...freeNames(value)];
    const declaration = dependencies.find(name => manifest.excluded_rule_spreads.includes(name)) ||
      (value.type === "Identifier" ? value.name : "main.rules[" + i + "]");
    const rules = evaluate(value);
    baseRules.push({
      source: declaration, position, excluded: dependencies.some(name => manifest.excluded_rule_spreads.includes(name)),
      rules: Array.isArray(rules) ? Array.from(rules) : [rules],
    });
  }
  const services = JSON.parse(JSON.stringify(read("serviceConfigs")));
  const regions = read("regionDefinitions"), rates = read("rateRegionDefinitions");
  const icons = {};
  for (const item of [...services, ...regions, ...rates]) if (item.icon !== undefined) icons[item.name] = item.icon;
  // Generated group names/icons are read from their defining syntax, independent of sample nodes.
  walk(ast, node => {
    const groupCall = node.type === "CallExpression" && node.callee.type === "Identifier" &&
      node.callee.name === "createRegionGroup";
    const name = groupCall ? node.arguments[0] : node.type === "ObjectExpression" ? property(node, "name")?.value : null;
    const icon = groupCall ? node.arguments[1] : node.type === "ObjectExpression" ? property(node, "icon")?.value : null;
    if (name && icon) {
      try { const key = evaluate(name), value = evaluate(icon); if (typeof key === "string") icons[key] = value; } catch {}
    }
  });
  return {
    ast, index, evaluate, main, baseRules, services, icons,
    baseRuleProviders: JSON.parse(JSON.stringify(read("baseRuleProviders"))),
    ruleSetBaseUrl: read("ruleSetBaseUrl"),
    groupTestUrl: read("groupBaseOption").url,
    regionDefinitions: Array.from(regions, ({name, regex}) => ({name, regex: String(regex)})),
    rateRegionDefinitions: Array.from(rates, ({name, regex}) => ({name, regex: String(regex)})),
    lowRateRegionName: read("lowRateRegionName"),
    nativeOptions: JSON.parse(JSON.stringify(read("ruleOptionsEnable"))),
  };
}

function removePath(object, path) {
  const [head, ...tail] = path;
  if (!tail.length) object.properties = object.properties.filter(item => keyOf(item) !== head);
  else { const child = property(object, head)?.value; if (child?.type === "ObjectExpression") removePath(child, tail); }
}

export function globalConfigFunction(model, manifest) {
  const omitted = new Set(["dns", "hosts", "proxies", "proxy-groups", "rule-providers", "rules"]);
  const object = {type: "ObjectExpression", properties: []};
  for (const entry of assignments(model.main)) {
    if (!omitted.has(entry.key)) put(object, entry.key, clone(entry.value));
  }
  for (const path of manifest.omitted_global_fields) removePath(object, path.split("."));
  for (const [key, value] of Object.entries(manifest.global_overrides)) put(object, key, literal(value));
  return parseScript("function buildGlobalConfig(config, filteredProxies) { return " + generate(object) + "; }").body[0];
}

export function compileScript(model, manifest, domains, plan, runtime, provenance) {
  const index = new Map([...model.index].map(([name, entry]) => [name, {...entry, node: clone(entry.node)}]));
  const runtimeAst = parseScript(runtime);
  for (const name of blockBindings(runtimeAst.body)) index.delete(name);
  let order = Math.max(...[...index.values()].map(entry => entry.order)) + 1;
  const setDeclaration = (name, node) => index.set(name, {node, order: index.get(name)?.order ?? order++});
  const setValue = (name, value) => setDeclaration(name, parseScript("const " + name + " = " + JSON.stringify(value) + ";").body[0]);
  const regions = model.evaluate(model.index.get("regionDefinitions").node.declarations[0].init);
  const ratesNode = clone(model.index.get("rateRegionDefinitions").node.declarations[0].init);
  if (ratesNode.type !== "ArrayExpression") throw new Error("Expected upstream rate definitions array");
  ratesNode.elements = ratesNode.elements.filter(node => {
    const name = property(node, "name")?.value;
    return name && model.evaluate(name) === model.lowRateRegionName;
  });
  setDeclaration("rateRegionDefinitions", {...clone(model.index.get("rateRegionDefinitions").node),
    declarations: [{...clone(model.index.get("rateRegionDefinitions").node.declarations[0]), init: ratesNode}]});
  setDeclaration("buildDnsAndHostsConfig", transformDns(model.index.get("buildDnsAndHostsConfig").node, manifest, domains));
  setDeclaration("buildGlobalConfig", globalConfigFunction(model, manifest));
  setValue("repczRealIpDomains", domains);
  setValue("directProxies", manifest.direct_proxies);
  setValue("finalRuleProviders", plan.providers);
  setValue("finalRules", plan.rules);
  setValue("groupTestUrl", model.groupTestUrl ?? null);
  const aliases = {...Object.fromEntries(Array.from(regions, region => [region.name, region.name])), ...manifest.group_icon_sources};
  const icons = Object.fromEntries(Object.entries(aliases).filter(([, source]) => model.icons[source] !== undefined)
    .map(([name, source]) => [name, model.icons[source]]));
  setValue("groupIcons", icons);
  setValue("ruleOptionsEnable", manifest.node_options);
  setValue("Compatible_With_Bettbox", {ruleOptionsEnable: true});
  const selected = dependencyClosure(index, [...freeNames(runtimeAst), "Compatible_With_Bettbox"]);
  const neededOptions = {...manifest.node_options};
  for (const entry of [...selected, {node: runtimeAst}]) walk(entry.node, node => {
    if (node.type === "MemberExpression" && node.object.type === "Identifier" &&
        node.object.name === "ruleOptionsEnable") {
      const name = keyOf(node);
      if (name && Object.hasOwn(model.nativeOptions, name) && !Object.hasOwn(neededOptions, name)) neededOptions[name] = model.nativeOptions[name];
    }
  });
  const options = selected.find(entry => entry.name === "ruleOptionsEnable");
  if (options) options.node = parseScript("const ruleOptionsEnable = " + JSON.stringify(neededOptions) + ";").body[0];
  for (const entry of selected) walk(entry.node, node => {
    if (node.type === "Literal" && typeof node.value === "string" && node.value.includes("#")) {
      const split = node.value.lastIndexOf("#"), target = node.value.slice(split + 1);
      if (target !== "DIRECT" && manifest.policy_aliases[target]) {
        node.value = node.value.slice(0, split + 1) + manifest.policy_aliases[target];
        node.raw = JSON.stringify(node.value);
      }
    }
  });
  const header = "/**\n * Mihomo single-subscription override; upstream author: AIsouler.\n" +
    " * Source: https://github.com/AIsouler/MyClash\n * Upstream commit: " + provenance.commit +
    "\n * Generated from upstream AST and custom sources. MIT license retained.\n */\n";
  const program = {type: "Program", sourceType: "script", body: [...selected.map(entry => entry.node), ...runtimeAst.body]};
  const script = header + generate(program, {indent: "  "}).trimEnd() + "\n";
  return {script, icons, emittedDeclarations: selected.map(entry => entry.name)};
}
