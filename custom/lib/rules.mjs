import { isDeepStrictEqual } from "node:util";

export const BUILTIN_ACTIONS = new Set(["DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE"]);
const FLAGS = new Set(["no-resolve", "src", "dst", "extended-matching"]);

export function splitRule(text) {
  const parts = [];
  let start = 0, depth = 0, escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") escaped = true;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) { parts.push(text.slice(start, i)); start = i + 1; }
    if (depth < 0) throw new Error("Unbalanced rule: " + text);
  }
  if (depth) throw new Error("Unbalanced rule: " + text);
  parts.push(text.slice(start));
  return parts;
}

export function policyIndex(parts) {
  let i = parts.length - 1;
  while (i > 0 && FLAGS.has(parts[i].trim())) i--;
  if (i < (parts[0].trim() === "MATCH" ? 1 : 2)) throw new Error("Rule requires a policy: " + parts.join(","));
  return i;
}

export function retargetRule(rule, target, preserveActions = true) {
  const parts = splitRule(rule), index = policyIndex(parts);
  if (parts[0].trim() === "SUB-RULE") return rule;
  if (!preserveActions || !BUILTIN_ACTIONS.has(parts[index].trim())) parts[index] = target;
  return parts.join(",");
}

export function matchesRule(rule, selector) {
  const parts = splitRule(rule);
  return parts[0].trim() === selector.type &&
    (selector.value === undefined || parts[1]?.trim() === selector.value);
}

export function overrideUrl(provider, url) {
  const value = { ...provider };
  if (url !== undefined) { value.url = url; delete value["path-in-bundle"]; }
  return value;
}

function replaceFilename(value, from, to) {
  const slash = value.lastIndexOf("/"), filename = value.slice(slash + 1), dot = filename.lastIndexOf(".");
  const stem = dot < 0 ? filename : filename.slice(0, dot);
  if (decodeURIComponent(stem) !== from) throw new Error("Explicit ruleset replacement source changed: " + value);
  return value.slice(0, slash + 1) + to + (dot < 0 ? "" : filename.slice(dot));
}

export function replaceProviderAsset(provider, replacement) {
  const value = { ...provider };
  for (const field of ["url", "path", "path-in-bundle"]) {
    if (value[field] === undefined) continue;
    if (field === "url") {
      const url = new URL(value[field]);
      url.pathname = replaceFilename(url.pathname, replacement.from, replacement.to);
      value[field] = url.href;
    } else {
      value[field] = replaceFilename(value[field], replacement.from, replacement.to);
    }
  }
  return value;
}

export function validateProvider(name, provider) {
  if (!provider || typeof provider !== "object" || Array.isArray(provider) ||
      typeof provider.type !== "string" || typeof provider.behavior !== "string") {
    throw new Error("Invalid provider definition: " + name);
  }
  if (provider.type === "http" && typeof provider.url !== "string") throw new Error("HTTP provider requires URL: " + name);
  if (provider.type === "file" && typeof provider.path !== "string") throw new Error("File provider requires path: " + name);
  if (provider.type === "inline" && !Array.isArray(provider.payload)) throw new Error("Inline provider requires payload: " + name);
}

export function planRules(model, manifest) {
  const providers = {}, services = {}, coverage = [], usedOverrides = new Set();
  const excludedBase = new Set(manifest.excluded_base_rule_providers);
  const excludedServices = new Set(manifest.excluded_services);
  const addProvider = (name, provider, origin) => {
    validateProvider(name, provider);
    if (Object.hasOwn(providers, name) && !isDeepStrictEqual(providers[name], provider)) {
      throw new Error("Provider name conflict: " + name + " from " + origin);
    }
    providers[name] = provider;
  };
  for (const [name, provider] of Object.entries(model.baseRuleProviders)) {
    if (excludedBase.has(name)) continue;
    const replacement = manifest.base_rule_provider_replacements[name];
    const outputName = replacement?.name || name;
    const url = manifest.base_rule_provider_url_overrides[name];
    if (url !== undefined) usedOverrides.add("base:" + name);
    addProvider(outputName, overrideUrl(replacement ? replaceProviderAsset(provider, replacement) : provider, url), "base");
  }
  const seen = new Set();
  for (const service of model.services) {
    if (seen.has(service.name)) throw new Error("Duplicate upstream service: " + service.name);
    seen.add(service.name);
    if (excludedServices.has(service.name) || !service.rules?.length) {
      for (const rule of service.rules || []) coverage.push({ origin: "service", service: service.name, source: rule, status: "excluded", reason: "service-policy" });
      continue;
    }
    services[service.name] = service;
    for (const [name, provider] of Object.entries(service.providers || {})) {
      const url = manifest.service_provider_url_overrides[service.name]?.[name];
      if (url !== undefined) usedOverrides.add("service:" + service.name + ":" + name);
      addProvider(name, overrideUrl(provider, url), service.name);
    }
  }
  for (const [name, service] of Object.entries(manifest.additional_services)) {
    if (Object.hasOwn(services, name)) throw new Error("Upstream/additional service conflict: " + name);
    services[name] = {name, ...service, additional: true};
    for (const [key, provider] of Object.entries(service.providers || {})) {
      const {upstream_asset, ...definition} = provider;
      if (upstream_asset !== undefined) {
        if (!/^geo(?:site|ip)\/[a-z0-9@!._-]+\.mrs$/.test(upstream_asset)) throw new Error("Invalid inherited Bett asset: " + upstream_asset);
        definition.url = new URL(upstream_asset, model.ruleSetBaseUrl).href;
      }
      addProvider(key, definition, name);
    }
  }
  for (const [name, provider] of Object.entries(manifest.additional_rule_providers)) addProvider(name, provider, "additional");

  const blocks = Object.fromEntries(manifest.rule_blocks.map(name => [name, []]));
  const plan = Object.values(services).map((service, sequence) => ({
    service, sequence, ...manifest.default_service_routing, ...manifest.service_routing[service.name],
  })).sort((a, b) => a.order - b.order || a.sequence - b.sequence);
  for (const entry of plan) {
    if (!blocks[entry.section]) throw new Error("Unknown routing section: " + entry.section);
    for (const rule of entry.service.rules || []) {
      const output = retargetRule(rule, entry.target);
      blocks[entry.section].push(output);
      if (!entry.service.additional) coverage.push({
        origin: "service", service: entry.service.name, source: rule,
        status: output === rule ? "adopted" : "mapped", outputs: [output], section: entry.section,
      });
    }
  }

  const providerHosts = new Set(Object.values(model.baseRuleProviders)
    .filter(provider => provider.url).map(provider => new URL(provider.url).hostname));
  const baseEntries = {}, seenBaseRules = new Set();
  let sequence = 0;
  for (const native of model.baseRules) {
    for (const rule of native.rules) {
      const record = {origin: "base", declaration: native.source, position: native.position, source: rule};
      if (native.excluded || manifest.excluded_rules.some(selector => matchesRule(rule, selector))) {
        coverage.push({...record, status: "excluded", reason: native.excluded ? "spread-policy" : "rule-policy"});
        continue;
      }
      const parts = splitRule(rule);
      if (parts[0] === "MATCH") {
        coverage.push({...record, status: "mapped", outputs: manifest.custom_rules.final, section: "final"});
        continue;
      }
      const name = parts[0] === "RULE-SET" ? parts[1] : undefined;
      const placement = manifest.base_rule_routing[name] || {};
      let section = placement.section || (native.position === "before_services" ? "direct" : "fallback");
      if (parts[0] === "DOMAIN" && providerHosts.has(parts[1])) section = "bootstrap";
      if (name) parts[1] = manifest.base_rule_provider_replacements[name]?.name || name;
      const index = policyIndex(parts);
      parts[index] = manifest.policy_aliases[parts[index]] || parts[index];
      if (placement.no_resolve && !parts.slice(index + 1).includes("no-resolve")) parts.push("no-resolve");
      const output = parts.join(",");
      coverage.push({...record, status: output === rule ? "adopted" : "mapped", outputs: [output], section});
      if (seenBaseRules.has(output)) continue;
      seenBaseRules.add(output);
      (baseEntries[section] ||= []).push({order: placement.order ?? sequence + 100, sequence, output});
      sequence++;
    }
  }
  for (const [section, entries] of Object.entries(baseEntries)) {
    if (!blocks[section]) throw new Error("Unknown base rule section: " + section);
    blocks[section].push(...entries.sort((a, b) => a.order - b.order || a.sequence - b.sequence).map(entry => entry.output));
  }
  for (const [section, rules] of Object.entries(manifest.custom_rules)) blocks[section].push(...rules);
  const rules = manifest.rule_blocks.flatMap(section => blocks[section]);
  if (new Set(rules).size !== rules.length) throw new Error("Duplicate final routing rules");
  const stale = [];
  for (const name of Object.keys(manifest.base_rule_provider_replacements)) {
    if (!Object.hasOwn(model.baseRuleProviders, name)) stale.push("base-replacement:" + name);
  }
  for (const selector of manifest.excluded_rules) {
    if (!model.baseRules.some(entry => entry.rules.some(rule => matchesRule(rule, selector)))) {
      stale.push("rule-exclusion:" + selector.type + ":" + selector.value);
    }
  }
  for (const name of Object.keys(manifest.service_routing)) if (!services[name]) stale.push("service-routing:" + name);
  for (const name of Object.keys(manifest.base_rule_provider_url_overrides)) {
    if (!usedOverrides.has("base:" + name)) stale.push("base-url:" + name);
  }
  for (const [service, values] of Object.entries(manifest.service_provider_url_overrides)) {
    for (const name of Object.keys(values)) {
      if (!usedOverrides.has("service:" + service + ":" + name)) stale.push("service-url:" + service + ":" + name);
    }
  }
  const defaults = plan.filter(entry => !Object.hasOwn(manifest.service_routing, entry.service.name))
    .map(entry => ({name: entry.service.name, target: entry.target, section: entry.section}));
  return {providers, rules, blocks, coverage, stale, defaults, selectedServices: Object.keys(services)};
}
