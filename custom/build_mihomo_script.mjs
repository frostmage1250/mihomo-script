import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractModel, compileScript } from "./lib/ast.mjs";
import { planRules } from "./lib/rules.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await fs.readFile(path.join(root, "custom/customizations.json"), "utf8"));
const upstream = process.env.UPSTREAM_DIR;
if (!upstream) throw new Error("UPSTREAM_DIR is required");
const [source, routing, runtime, license] = await Promise.all([
  fs.readFile(path.join(upstream, manifest.upstream.path), "utf8"),
  fs.readFile(path.join(upstream, manifest.routing_reference.path), "utf8"),
  fs.readFile(path.join(root, manifest.runtime), "utf8"),
  fs.readFile(path.join(upstream, "LICENSE"), "utf8"),
]);
const model = extractModel(source, manifest, routing);
const script = compileScript(model, manifest, planRules(model, manifest), runtime);
await fs.writeFile(path.join(root, manifest.output), script);
await fs.writeFile(path.join(root, "LICENSE"), license);
