import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const sha256 = value => createHash("sha256").update(value).digest("hex");
export const git = (...args) => execFileSync("git", args, {cwd: ROOT, encoding: "utf8"}).trim();
export async function fetchText(url) {
  const headers = {"User-Agent": "mihomo-script-builder", Accept: "application/vnd.github+json"};
  if (process.env.GH_TOKEN && new URL(url).hostname === "api.github.com") headers.Authorization = "Bearer " + process.env.GH_TOKEN;
  const response = await fetch(url, {headers, signal: AbortSignal.timeout(60000)});
  if (!response.ok) throw new Error("Source HTTP " + response.status + ": " + url);
  return response.text();
}
export async function capture() {
  const manifestText = await fs.readFile(path.join(ROOT, "custom/customizations.json"), "utf8");
  const manifest = JSON.parse(manifestText);
  const upstreamCommit = git("rev-parse", "refs/remotes/upstream/main");
  const fileCommit = git("log", "-1", "--format=%H", "refs/remotes/upstream/main", "--", manifest.upstream.path);
  const upstream = await fs.readFile(path.join(ROOT, manifest.upstream.path), "utf8");
  const restored = execFileSync("git", ["show", upstreamCommit + ":" + manifest.upstream.path], {cwd: ROOT, encoding: "utf8"});
  if (upstream !== restored) throw new Error("Retained source differs from fixed upstream commit");
  const repcz = manifest.real_ip_domains_upstream;
  const query = new URLSearchParams({sha: repcz.branch, path: repcz.path, per_page: "1"});
  const [lastChange] = JSON.parse(await fetchText("https://api.github.com/repos/" + repcz.repository + "/commits?" + query));
  const commit = lastChange.sha;
  const repczSource = await fetchText("https://raw.githubusercontent.com/" + repcz.repository + "/" + commit + "/" + repcz.path);
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
    upstream: {repository: manifest.upstream.repository, commit: upstreamCommit, file_commit: fileCommit, path: manifest.upstream.path, sha256: sha256(upstream)},
    real_ip_domains: {repository: repcz.repository, commit, path: repcz.path, sha256: sha256(repczSource)},
    local_files: localFiles,
    dependency_lock_sha256: sha256(packageLock),
    validation,
  };
  const snapshot = {lock, manifest, runtime, upstream, repcz: repczSource};
  await fs.mkdir(path.join(ROOT, ".build"), {recursive: true});
  await fs.writeFile(path.join(ROOT, ".build/snapshot.json"), JSON.stringify(snapshot, null, 2) + "\n");
  console.log("Fixed sources: MyClash " + upstreamCommit + ", Repcz " + commit);
  return snapshot;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  capture().catch(error => { console.error(error.message); process.exitCode = 1; });
}
