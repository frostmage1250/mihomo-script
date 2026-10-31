import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const sha256 = value => createHash("sha256").update(value).digest("hex");
export async function fetchText(url) {
  const headers = {"User-Agent": "mihomo-script-builder", Accept: "application/vnd.github+json"};
  if (process.env.GH_TOKEN && new URL(url).hostname === "api.github.com") headers.Authorization = "Bearer " + process.env.GH_TOKEN;
  const response = await fetch(url, {headers, signal: AbortSignal.timeout(60000)});
  if (!response.ok) throw new Error("Source HTTP " + response.status + ": " + url);
  return response.text();
}
export async function readLatestUpstream(manifest, read = fetchText) {
  const {repository, branch = "main", path: scriptPath} = manifest.upstream;
  if (manifest.routing_reference.repository !== repository) {
    throw new Error("The script and routing reference must use the same upstream repository");
  }
  const head = JSON.parse(await read("https://api.github.com/repos/" + repository +
    "/commits/" + encodeURIComponent(branch)));
  const upstreamCommit = head.sha;
  if (!/^[0-9a-f]{40}$/.test(upstreamCommit || "")) throw new Error("Invalid upstream main commit");
  const rawBase = "https://raw.githubusercontent.com/" + repository + "/" + upstreamCommit + "/";
  const [upstream, routingReference, license, historyText] = await Promise.all([
    read(rawBase + scriptPath),
    read(rawBase + manifest.routing_reference.path),
    read(rawBase + "LICENSE"),
    read("https://api.github.com/repos/" + repository + "/commits?sha=" + upstreamCommit +
      "&path=" + encodeURIComponent(scriptPath) + "&per_page=1"),
  ]);
  const fileCommit = JSON.parse(historyText)[0]?.sha;
  if (!/^[0-9a-f]{40}$/.test(fileCommit || "")) throw new Error("Invalid upstream script file commit");
  return {upstreamCommit, fileCommit, upstream, routingReference, license};
}
export async function capture() {
  const manifestText = await fs.readFile(path.join(ROOT, "custom/customizations.json"), "utf8");
  const manifest = JSON.parse(manifestText);
  const {upstreamCommit, fileCommit, upstream, routingReference, license} =
    await readLatestUpstream(manifest);
  console.log("Fetched latest " + manifest.upstream.repository + "/" +
    manifest.upstream.branch + " at " + upstreamCommit);
  const referencePath = manifest.routing_reference.path;
  for (const [file, content] of [
    [manifest.upstream.path, upstream], [referencePath, routingReference], ["LICENSE", license],
  ]) {
    await fs.mkdir(path.dirname(path.join(ROOT, file)), {recursive: true});
    await fs.writeFile(path.join(ROOT, file), content);
  }
  const runtime = await fs.readFile(path.join(ROOT, manifest.runtime), "utf8");
  const packageLock = await fs.readFile(path.join(ROOT, "package-lock.json"), "utf8");
  const sourceFiles = ["custom/build_mihomo_script.mjs", "custom/snapshot.mjs", "custom/lib/ast.mjs", "custom/lib/rules.mjs", manifest.runtime, "custom/customizations.json"];
  const localFiles = {};
  for (const file of sourceFiles) localFiles[file] = sha256(await fs.readFile(path.join(ROOT, file)));
  const validation = JSON.parse(await fs.readFile(path.join(ROOT, ".build/validation.json"), "utf8"));
  const cargoLock = await fs.readFile(path.join(ROOT, "tests/bettbox-runner/Cargo.lock"), "utf8");
  const metadata = JSON.parse(execFileSync("cargo", ["metadata", "--offline", "--locked", "--format-version", "1",
    "--manifest-path", "tests/bettbox-runner/Cargo.toml"], {cwd: ROOT, encoding: "utf8"}));
  const profile = manifest.client_compatibility;
  validation.bettbox = {
    reference: profile.bettbox_reference,
    rquickjs: metadata.packages.find(item => item.name === "rquickjs").version,
    cargo_lock_sha256: sha256(cargoLock),
    memory_limit: profile.memory_limit,
    stack_limit: profile.stack_limit,
    timeout_seconds: profile.timeout_seconds,
  };
  const lock = {
    schema_version: 1,
    upstream: {repository: manifest.upstream.repository, branch: manifest.upstream.branch, commit: upstreamCommit, file_commit: fileCommit, path: manifest.upstream.path, sha256: sha256(upstream)},
    license: {repository: manifest.upstream.repository, commit: upstreamCommit, path: "LICENSE", sha256: sha256(license)},
    routing_reference: {repository: manifest.routing_reference.repository, commit: upstreamCommit,
      path: referencePath, sha256: sha256(routingReference)},
    local_files: localFiles,
    dependency_lock_sha256: sha256(packageLock),
    validation,
  };
  const snapshot = {lock, manifest, runtime, upstream, routingReference};
  await fs.mkdir(path.join(ROOT, ".build"), {recursive: true});
  await fs.writeFile(path.join(ROOT, ".build/snapshot.json"), JSON.stringify(snapshot, null, 2) + "\n");
  console.log("Fixed sources: MyClash " + upstreamCommit);
  return snapshot;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  capture().catch(error => { console.error(error.message); process.exitCode = 1; });
}
