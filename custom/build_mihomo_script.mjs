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
    schema_version: 3,
    source_mode: "native-git-merge",
    source_lock: manifest.source_lock,
    output_sha256: sha256(compiled.script),
    real_ip_domains: {applied_domains: domains.applied, excluded_domains: domains.excluded},
    rule_blocks: plan.blocks,
    rule_coverage: plan.coverage,
    stale_customizations: plan.stale,
    default_service_routes: plan.defaults,
    selected_services: plan.selectedServices,
    applied_group_icons: compiled.icons,
  };
  return {script: compiled.script, report: JSON.stringify(report, null, 2) + "\n", lock: JSON.stringify(lock, null, 2) + "\n"};
}

export async function build() {
  const snapshot = JSON.parse(await fs.readFile(path.join(ROOT, ".build/snapshot.json"), "utf8"));
  for (const [file, digest] of Object.entries(snapshot.lock.local_files)) {
    if (sha256(await fs.readFile(path.join(ROOT, file))) !== digest) throw new Error("Source changed after snapshot: " + file);
  }
  const result = render(snapshot);
  const files = [[snapshot.manifest.output, result.script], [snapshot.manifest.report, result.report], [snapshot.manifest.source_lock, result.lock]];
  await Promise.all(files.map(([file, content]) => fs.writeFile(path.join(ROOT, file), content)));
  console.log("Generated the script, report, and source lock once from fixed inputs.");
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
