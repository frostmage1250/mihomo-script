import { parse } from "acorn";
import { generate } from "astring";

const parseScript = source => parse(source, {ecmaVersion: "latest", sourceType: "script"});
const expression = source => parseScript("(" + source + ")").body[0].expression;
const literal = value => expression(JSON.stringify(value));
const keyOf = property => property.key.type === "Identifier" ? property.key.name : property.key.value;

export function compileScript(source, manifest, runtime) {
  if (manifest.schema_version !== 3) throw new Error("Unsupported customization schema");
  const ast = parseScript(source);
  const declarations = new Map();
  for (const statement of ast.body) {
    if (statement.type === "VariableDeclaration") {
      for (const item of statement.declarations) declarations.set(item.id.name, item.init);
    }
  }
  for (const name of ["customRuleOrder", "applyCustomRuleOrder", "omittedGroupTestingFields", "removeGroupTestingFields"]) {
    if (declarations.has(name) || ast.body.some(node => node.id?.name === name)) {
      throw new Error("Customization binding conflicts with upstream: " + name);
    }
  }
  const binding = (name, type) => {
    const node = declarations.get(name);
    if (node?.type !== type) throw new Error("Upstream binding changed: " + name);
    return node;
  };
  const dnsEdits = [];
  if (manifest.dns_overrides) {
    const dnsBuilder = ast.body.find(node =>
      node.type === "FunctionDeclaration" && node.id.name === "buildDnsAndHostsConfig");
    const dns = dnsBuilder?.body.body
      .filter(node => node.type === "VariableDeclaration")
      .flatMap(node => node.declarations)
      .find(node => node.id.name === "dns")?.init;
    if (dns?.type !== "ObjectExpression") throw new Error("Upstream DNS construction changed");
    const property = (object, name) => {
      const item = object.properties.find(node => node.type === "Property" && keyOf(node) === name);
      if (!item) throw new Error("Missing upstream DNS field: " + name);
      return item.value;
    };
    const replaceValue = (node, value) => dnsEdits.push({
      start: node.start, end: node.end, text: JSON.stringify(value),
    });
    for (const [name, value] of Object.entries(manifest.dns_overrides)) {
      if (name === "nameserver-policy") {
        const policy = property(dns, name);
        if (policy.type !== "ObjectExpression") throw new Error("Upstream DNS policy changed");
        for (const [domain, servers] of Object.entries(value)) {
          replaceValue(property(policy, domain), servers);
        }
      } else {
        replaceValue(property(dns, name), value);
      }
    }
  }
  if (manifest.hosts_exclude_suffixes?.length) {
    const dnsBuilder = ast.body.find(node =>
      node.type === "FunctionDeclaration" && node.id.name === "buildDnsAndHostsConfig");
    const hosts = dnsBuilder?.body.body
      .filter(node => node.type === "VariableDeclaration")
      .flatMap(node => node.declarations)
      .find(node => node.id.name === "hosts")?.init;
    if (hosts?.type !== "ObjectExpression") throw new Error("Upstream hosts construction changed");
    const suffixes = manifest.hosts_exclude_suffixes;
    if (suffixes.some(value => typeof value !== "string" || !/^[a-z0-9.-]+$/.test(value))) {
      throw new Error("Invalid hosts exclusion suffix");
    }
    hosts.properties = hosts.properties.filter(item => {
      if (item.type !== "Property" || item.computed) {
        throw new Error("Unsupported upstream hosts property");
      }
      const hostname = String(keyOf(item)).replace(/^[*+.]+/, "").toLowerCase();
      return !suffixes.some(suffix => hostname === suffix || hostname.endsWith("." + suffix));
    });
    dnsEdits.push({start: hosts.start, end: hosts.end, text: generate(hosts).trimEnd()});
  }
  const options = binding("ruleOptionsEnable", "ObjectExpression");
  const providers = binding("baseRuleProviders", "ObjectExpression");
  const services = binding("serviceConfigs", "ArrayExpression");
  for (const [name, value] of Object.entries(manifest.option_defaults || {})) {
    const option = options.properties.find(item => item.type === "Property" && keyOf(item) === name);
    if (!option) throw new Error("Missing upstream option: " + name);
    option.value = literal(value);
  }
  const testingFields = new Set(manifest.omitted_group_testing_fields || []);
  const testingNodes = [];
  if (testingFields.size > 0) {
    for (const name of ["groupBaseOption", "urlTestBaseOption", "loadBalanceBaseOption"]) {
      const node = binding(name, "ObjectExpression");
      node.properties = node.properties.filter(item =>
        item.type !== "Property" || !testingFields.has(keyOf(item)));
      testingNodes.push(node);
    }
  }
  const existingServices = new Set(services.elements
    .filter(node => node.type === "ObjectExpression")
    .map(node => node.properties.find(item => item.type === "Property" && keyOf(item) === "name")?.value.value));
  const addProperty = (object, name, value) => {
    if (object.properties.some(item => item.type === "Property" && keyOf(item) === name)) {
      throw new Error("Upstream already defines customization: " + name);
    }
    object.properties.push({
      type: "Property", key: literal(name), value, kind: "init",
      method: false, shorthand: false, computed: false,
    });
  };
  const providerNode = provider => {
    const {upstream_asset, ...definition} = provider;
    const node = literal(definition);
    if (upstream_asset !== undefined) {
      if (!/^geosite\/[a-z0-9@!._-]+\.mrs$/.test(upstream_asset)) {
        throw new Error("Invalid inherited Bett asset: " + upstream_asset);
      }
      addProperty(node, "url", {
        type: "BinaryExpression", operator: "+",
        left: {type: "Identifier", name: "ruleSetBaseUrl"}, right: literal(upstream_asset),
      });
    }
    return node;
  };
  for (const [name, definition] of Object.entries(manifest.rule_provider_overrides || {})) {
    const provider = providers.properties.find(item =>
      item.type === "Property" && keyOf(item) === name);
    if (!provider) throw new Error("Missing upstream provider: " + name);
    provider.value = providerNode(definition);
  }
  for (const [name, definition] of Object.entries(manifest.additional_rule_providers)) {
    addProperty(providers, name, providerNode(definition));
  }
  for (const [name, service] of Object.entries(manifest.additional_services)) {
    if (existingServices.has(name)) throw new Error("Upstream already defines service: " + name);
    addProperty(options, name, literal(true));
    const node = literal({name, ...service});
    addProperty(node, "baseOption", {type: "Identifier", name: "selectBaseOption"});
    const providerObject = node.properties.find(item => keyOf(item) === "providers").value;
    providerObject.properties = [];
    for (const [key, definition] of Object.entries(service.providers)) {
      addProperty(providerObject, key, providerNode(definition));
    }
    services.elements.push(node);
  }
  const main = ast.body.find(node => node.type === "FunctionDeclaration" && node.id.name === "main");
  if (!main) throw new Error("Missing upstream main");
  const rulesStatement = main.body.body.find(node => {
    const value = node.type === "ExpressionStatement" && node.expression;
    return value?.type === "AssignmentExpression" &&
      value.left.type === "MemberExpression" &&
      value.left.object.name === "newConfig" &&
      (value.left.computed ? value.left.property.value : value.left.property.name) === "rules";
  });
  const rules = rulesStatement?.expression.right;
  if (rules?.type !== "ArrayExpression") throw new Error("Upstream rule construction changed");
  const serviceIndex = rules.elements.findIndex(node => node.type === "SpreadElement" &&
    node.argument.type === "Identifier" && node.argument.name === "functionalRules");
  if (serviceIndex < 0) throw new Error("Missing functional-rule stage");
  rules.elements.splice(serviceIndex, 0, ...manifest.additional_rules.map(literal));
  const returns = main.body.body.filter(node => node.type === "ReturnStatement" && node.argument?.name === "newConfig");
  if (returns.length !== 1) throw new Error("Upstream main return changed");
  const edits = [options, providers, services, rules, ...testingNodes].map(node => ({
    start: node.start, end: node.end, text: generate(node).trimEnd(),
  }));
  edits.push(...dnsEdits);
  edits.push({start: returns[0].start, end: returns[0].start,
    text: "applyCustomRuleOrder(newConfig);\n  removeGroupTestingFields(newConfig);\n  "});
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return output.trimEnd() + "\n\n// Only the approved additional domain-rule placements are applied.\n" +
    "const customRuleOrder = " + JSON.stringify(manifest.rule_order_overrides, null, 2) + ";\n" +
    "const omittedGroupTestingFields = " + JSON.stringify(manifest.omitted_group_testing_fields || []) + ";\n" +
    runtime.trimEnd() + "\n";
}
