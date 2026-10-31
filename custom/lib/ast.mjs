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

export function transformDns(fn, manifest) {
  const result = clone(fn), dns = objectVariable(result, "dns"), hosts = objectVariable(result, "hosts");
  for (const [key, value] of Object.entries(manifest.dns_overrides)) put(dns, key, literal(value));
  const policy = property(dns, "nameserver-policy");
  if (policy?.value.type !== "ObjectExpression") throw new Error("Expected upstream nameserver policy object");
  for (const [key, value] of Object.entries(manifest.dns_policy_overrides)) put(policy.value, key, literal(value));
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

export function referenceRules(source) {
  const block = source.match(/^rules:\s*\r?\n([\s\S]*)$/m);
  if (!block) throw new Error("Missing YAML routing reference");
  const rules = block[1].split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s+-\s+(.+?)\s*$/);
    return match ? [match[1].replace(/\s+#.*$/, "").trim()] : [];
  });
  if (!rules.length) throw new Error("Empty YAML routing reference");
  return rules;
}

export function extractModel(source, manifest, routingReference) {
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
    const declaration = dependencies.find(name => manifest.excluded_rule_spreads.includes(name) ||
      Object.hasOwn(manifest.base_rule_spread_routing || {}, name)) ||
      (value.type === "Identifier" ? value.name : "main.rules[" + i + "]");
    // Keep both switch states available, including when upstream changes its default.
    const rules = declaration === "blockForeignQuic" ? read(declaration) : evaluate(value);
    baseRules.push({
      source: declaration, position, excluded: dependencies.some(name => manifest.excluded_rule_spreads.includes(name)),
      rules: Array.isArray(rules) ? Array.from(rules) : [rules],
    });
  }
  const services = JSON.parse(JSON.stringify(read("serviceConfigs")));
  const reference = routingReference === undefined ? [] : referenceRules(routingReference);
  const referenceRuleRanks = Object.fromEntries(reference.map((rule, index) => [rule, index]));
  const serviceRanks = {};
  for (const service of services) {
    const ranks = (service.rules || []).filter(rule => Object.hasOwn(referenceRuleRanks, rule))
      .map(rule => referenceRuleRanks[rule]);
    if (ranks.length) serviceRanks[service.name] = Math.min(...ranks);
  }
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
    ast, index, evaluate, main, ruleExpression, baseRules, services, icons, serviceRanks, referenceRuleRanks,
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

export function compileScript(model, manifest, plan, runtime, provenance) {
  if (manifest.preserve_original_proxy_names !== true ||
      manifest.proxy_name_deduplication !== "exact-name-first") {
    throw new Error("Original proxy names and exact-name-first deduplication must be preserved");
  }
  if (manifest.policy_group_type !== "select") throw new Error("Policy groups must use manual select");
  const body = clone(model.ast).body;
  const replaceDeclaration = (name, replacement) => {
    const position = body.findIndex(node =>
      node.type === "FunctionDeclaration" ? node.id?.name === name :
      node.type === "VariableDeclaration" && node.declarations.some(item => item.id.name === name));
    if (position < 0) throw new Error("Missing upstream runtime declaration: " + name);
    body[position] = replacement;
  };
  const setValue = (name, value) =>
    replaceDeclaration(name, parseScript("const " + name + " = " + JSON.stringify(value) + ";").body[0]);
  const options = {...model.nativeOptions, ...manifest.node_options};
  for (const name of manifest.excluded_services) options[name] = false;
  for (const name of Object.keys(manifest.additional_services)) {
    if (!Object.hasOwn(options, name)) options[name] = true;
  }
  // Manual groups are an explicit customization, even when changed through the client UI.
  options.自动选择 = false;
  options.负载均衡 = false;
  options.生成地区自动选择组 = false;
  setValue("ruleOptionsEnable", options);
  setValue("directProxies", manifest.direct_proxies);
  const baseProviders = {};
  for (const name of Object.keys(model.baseRuleProviders)) {
    if (manifest.excluded_base_rule_providers.includes(name)) continue;
    const outputName = manifest.base_rule_provider_replacements[name]?.name || name;
    baseProviders[outputName] = plan.providers[outputName];
  }
  Object.assign(baseProviders, manifest.additional_rule_providers);
  setValue("baseRuleProviders", baseProviders);
  const services = model.services
    .filter(service => !manifest.excluded_services.includes(service.name) &&
      !["自动选择", "负载均衡"].includes(service.name))
    .map(service => ({...service, ...(service.providers && {
      providers: Object.fromEntries(Object.keys(service.providers).map(name => [name, plan.providers[name]])),
    })}));
  const selectBase = JSON.parse(JSON.stringify(model.evaluate(expression("selectBaseOption"))));
  for (const [name, value] of Object.entries(manifest.additional_services)) {
    services.push({...value, name, baseOption: selectBase,
      providers: Object.fromEntries(Object.keys(value.providers || {}).map(key => [key, plan.providers[key]]))});
  }
  setValue("serviceConfigs", services);
  replaceDeclaration("normalizeProxyName",
    parseScript("function normalizeProxyName(proxy) { return proxy; }").body[0]);
  // Keep the upstream custom-node workflow, applying the same original-name deduplication policy.
  const customize = clone(model.index.get("buildCustomizeGroups")?.node);
  if (!customize) throw new Error("Missing upstream custom-node workflow");
  let collisionRules = 0;
  walk(customize, node => {
    if (node.type !== "BlockStatement") return;
    node.body = node.body.map(statement => {
      if (statement.type !== "WhileStatement") return statement;
      if (!freeNames(statement.test).has("usedNames")) return statement;
      collisionRules++;
      return {type: "IfStatement", test: statement.test,
        consequent: {type: "ContinueStatement", label: null}, alternate: null};
    });
  });
  if (collisionRules !== 1) throw new Error("Upstream custom-node collision contract changed");
  replaceDeclaration("buildCustomizeGroups", customize);
  replaceDeclaration("buildDnsAndHostsConfig",
    transformDns(model.index.get("buildDnsAndHostsConfig").node, manifest));
  const mainIndex = body.findIndex(node => node.type === "FunctionDeclaration" && node.id.name === "main");
  if (mainIndex < 0) throw new Error("Missing upstream main");
  body[mainIndex].id.name = "upstreamMain";
  const icons = {};
  for (const [name, source] of Object.entries(manifest.group_icon_sources)) {
    if (source === null) icons[name] = null;
    else {
      if (model.icons[source] === undefined) throw new Error("Missing upstream group icon: " + source);
      icons[name] = model.icons[source];
    }
  }
  const policy = {
    groupType: manifest.policy_group_type,
    groupFields: manifest.policy_group_overrides,
    omittedGroupFields: manifest.omitted_policy_group_fields,
    groupCandidates: manifest.policy_group_candidates,
    groupOrder: manifest.policy_group_order,
    groupIcons: icons,
    aliases: manifest.policy_aliases,
    servicePlans: plan.servicePlans,
    blocks: plan.nonServiceBlocks,
    blockOrder: manifest.rule_blocks,
    globalOverrides: manifest.global_overrides,
    omittedGlobalFields: manifest.omitted_global_fields,
  };
  const header = "/**\n * Mihomo single-subscription override; upstream author: AIsouler.\n" +
    " * Source: https://github.com/AIsouler/MyClash\n * Upstream commit: " + provenance.commit +
    "\n * Full upstream runtime with explicit customizations. MIT license retained.\n */\n";
  const program = {type: "Program", sourceType: "script", body: [
    ...body,
    parseScript("const customizationPolicy = " + JSON.stringify(policy) + ";").body[0],
    ...parseScript(runtime).body,
  ]};
  const script = header + generate(program, {indent: "  "}).trimEnd() + "\n";
  return {script, icons, emittedDeclarations: body.flatMap(node =>
    node.type === "FunctionDeclaration" ? [node.id.name] :
    node.type === "VariableDeclaration" ? node.declarations.map(item => item.id.name) : [])};
}
