import { isDeepStrictEqual } from "node:util";

export const BUILTIN_ACTIONS = new Set(["DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE"]);
export const FLAGS = new Set(["no-resolve", "src", "dst", "extended-matching"]);

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

// Rewrite each emitted upstream rule in place; never regroup or sort routing.
export function rewriteRule(rule, policy) {
  const parts = splitRule(rule);
  if (policy.excludedRules.some(selector => parts[0].trim() === selector.type &&
      (selector.value === undefined || parts[1]?.trim() === selector.value))) return null;
  if (parts[0].trim() === "RULE-SET") {
    parts[1] = policy.providerReplacements[parts[1].trim()] || parts[1];
  }
  if (parts[0].trim() !== "SUB-RULE") {
    const index = policyIndex(parts), target = parts[index].trim();
    if (!BUILTIN_ACTIONS.has(target)) {
      parts[index] = policy.serviceTargets[target] || policy.aliases[target] || parts[index];
    }
  }
  return parts.join(",");
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
  const providers = {}, services = {};
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
    addProvider(outputName, overrideUrl(replacement ? replaceProviderAsset(provider, replacement) : provider, url), "base");
  }
  const seen = new Set();
  for (const service of model.services) {
    if (seen.has(service.name)) throw new Error("Duplicate upstream service: " + service.name);
    seen.add(service.name);
    if (excludedServices.has(service.name) || (!service.rules?.length && !service.ipRules?.length)) {
      continue;
    }
    services[service.name] = service;
    for (const [name, provider] of Object.entries(service.providers || {})) {
      const url = manifest.service_provider_url_overrides[service.name]?.[name];
      addProvider(name, overrideUrl(provider, url), service.name);
    }
  }
  for (const [name, service] of Object.entries(manifest.additional_services)) {
    if (Object.hasOwn(services, name)) throw new Error("Upstream/additional service conflict: " + name);
    services[name] = {name, ...service};
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

  const servicePlans = Object.values(services).map(service => ({
    name: service.name, target: manifest.service_targets[service.name] || manifest.default_service_target,
  }));
  return {providers, servicePlans};
}
