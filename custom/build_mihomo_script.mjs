import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { extractModel, compileScript } from "./lib/ast.mjs";
import { planRules } from "./lib/rules.mjs";
import { ROOT, sha256 } from "./snapshot.mjs";

export function selectDomains(source, exclusions) {
  const value = parseYaml(source);
  if (!Array.isArray(value?.real_ip_domains) || value.real_ip_domains.length === 0) throw new Error("Expected real_ip_domains YAML sequence");
  const domains = [...new Set(value.real_ip_domains.map(item => {
    if (typeof item !== "string") throw new Error("Expected a domain string in real_ip_domains");
    const domain = item.toLowerCase();
    if (domain.split(".").length < 2 || !domain.split(".").every(label => /^[a-z0-9*-]+$/.test(label))) {
      throw new Error("Invalid real-IP pattern: " + item);
    }
    return domain;
  }))];
  const excluded = domains.filter(item => exclusions.includes(item));
  const applied = domains.filter(item => !exclusions.includes(item));
  for (const item of applied) {
    if (item.split(".").some(label => label.includes("*") && label !== "*")) throw new Error("Unsupported real-IP wildcard: " + item);
  }
  return {domains, excluded, applied};
}

export function render(snapshot) {
  const {manifest, lock} = snapshot;
  if (sha256(snapshot.upstream) !== lock.upstream.sha256 ||
      sha256(snapshot.repcz) !== lock.real_ip_domains.sha256) throw new Error("Fixed source digest mismatch");
  const model = extractModel(snapshot.upstream, manifest);
  const domains = selectDomains(snapshot.repcz, manifest.real_ip_domain_exclusions);
  const plan = planRules(model, manifest);
  const compiled = compileScript(model, manifest, domains.applied, plan, snapshot.runtime, lock.upstream);
  const report = {
    schema_version: 2,
    upstream: lock.upstream,
    fork: {source_mode: "native-git-merge", upstream_commit: lock.upstream.commit, source_path: lock.upstream.path, source_sha256: lock.upstream.sha256},
    source_lock: lock,
    output_sha256: sha256(compiled.script),
    real_ip_domains_upstream: {...lock.real_ip_domains, domains: domains.domains, applied_domains: domains.applied, excluded_domains: domains.excluded},
    applied_prefix_rules: Object.fromEntries(["bootstrap", "private", "direct", "fallback"].map(key => [key, plan.blocks[key]])),
    applied_service_rule_blocks: Object.fromEntries(["before_direct", "after_direct"].map(key => [key, plan.blocks[key]])),
    rule_blocks: plan.blocks,
    rule_coverage: plan.coverage,
    stale_customizations: plan.stale,
    default_service_routes: plan.defaults,
    selected_services: plan.selectedServices,
    upstream_services: model.services,
    upstream_base_rule_providers: model.baseRuleProviders,
    upstream_base_rules: model.baseRules,
    upstream_regions: model.regionDefinitions,
    upstream_rate_regions: model.rateRegionDefinitions,
    applied_group_icons: compiled.icons,
    upstream_group_icons: model.icons,
    upstream_group_test_url: model.groupTestUrl,
    emitted_declarations: compiled.emittedDeclarations,
    client_compatibility: manifest.client_compatibility,
    global_overrides: manifest.global_overrides,
    omitted_global_fields: manifest.omitted_global_fields,
  };
  return {script: compiled.script, report: JSON.stringify(report, null, 2) + "\n", lock: JSON.stringify(lock, null, 2) + "\n"};
}

export async function build(check = false) {
  const snapshot = JSON.parse(await fs.readFile(path.join(ROOT, ".build/snapshot.json"), "utf8"));
  for (const [file, digest] of Object.entries(snapshot.lock.local_files)) {
    if (sha256(await fs.readFile(path.join(ROOT, file))) !== digest) throw new Error("Source changed after snapshot: " + file);
  }
  const result = render(snapshot);
  const files = [[snapshot.manifest.output, result.script], [snapshot.manifest.report, result.report], [snapshot.manifest.source_lock, result.lock]];
  const changed = [];
  for (const [file, content] of files) {
    let existing;
    try { existing = await fs.readFile(path.join(ROOT, file), "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (existing !== content) {
      changed.push(file);
      if (!check) await fs.writeFile(path.join(ROOT, file), content);
    }
  }
  if (check && changed.length) throw new Error("Generated outputs differ: " + changed.join(", "));
  console.log("Fixed-input build; changed files: " + changed.length);
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build(process.argv.includes("--check")).catch(error => { console.error(error.stack); process.exitCode = 1; });
}
