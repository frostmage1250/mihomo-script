import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractModel, compileScript } from "./lib/ast.mjs";
import { planRules } from "./lib/rules.mjs";
import { ROOT, sha256 } from "./snapshot.mjs";

export function render(snapshot) {
  const {manifest, lock} = snapshot;
  if (sha256(snapshot.upstream) !== lock.upstream.sha256) throw new Error("Fixed source digest mismatch");
  if (sha256(snapshot.routingReference) !== lock.routing_reference.sha256) throw new Error("Routing reference digest mismatch");
  const model = extractModel(snapshot.upstream, manifest, snapshot.routingReference);
  const plan = planRules(model, manifest);
  const compiled = compileScript(model, manifest, plan, snapshot.runtime, lock.upstream);
  const report = {
    schema_version: 3,
    source_mode: "fixed-upstream-snapshot",
    source_lock: manifest.source_lock,
    routing_reference: lock.routing_reference,
    output_sha256: sha256(compiled.script),
    fake_ip_mode: "upstream",
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
