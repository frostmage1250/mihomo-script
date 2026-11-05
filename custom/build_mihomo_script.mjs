import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileScript } from "./lib/ast.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await fs.readFile(path.join(root, "custom/customizations.json"), "utf8"));
const upstream = process.env.UPSTREAM_DIR;
if (!upstream) throw new Error("UPSTREAM_DIR is required");
const [source, runtime, license] = await Promise.all([
  fs.readFile(path.join(upstream, manifest.upstream.path), "utf8"),
  fs.readFile(path.join(root, manifest.runtime), "utf8"),
  fs.readFile(path.join(upstream, "LICENSE"), "utf8"),
]);
const script = compileScript(source, manifest, runtime);
await fs.writeFile(path.join(root, manifest.output), script);
await fs.writeFile(path.join(root, "LICENSE"), license);
