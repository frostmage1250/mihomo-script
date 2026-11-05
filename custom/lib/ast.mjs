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
  for (const name of ["customRuleOrder", "applyCustomRuleOrder"]) {
    if (declarations.has(name) || ast.body.some(node => node.id?.name === name)) {
      throw new Error("Customization binding conflicts with upstream: " + name);
    }
  }
  const binding = (name, type) => {
    const node = declarations.get(name);
    if (node?.type !== type) throw new Error("Upstream binding changed: " + name);
    return node;
  };
  const options = binding("ruleOptionsEnable", "ObjectExpression");
  const providers = binding("baseRuleProviders", "ObjectExpression");
  const services = binding("serviceConfigs", "ArrayExpression");
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
  const edits = [options, providers, services, rules].map(node => ({
    start: node.start, end: node.end, text: generate(node).trimEnd(),
  }));
  edits.push({start: returns[0].start, end: returns[0].start,
    text: "applyCustomRuleOrder(newConfig);\n  "});
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return output.trimEnd() + "\n\n// Only the approved additional domain-rule placements are applied.\n" +
    "const customRuleOrder = " + JSON.stringify(manifest.rule_order_overrides, null, 2) + ";\n" +
    runtime.trimEnd() + "\n";
}
