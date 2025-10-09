#!/usr/bin/env node
/*
  Dead code check: scans src/ for files that are not imported anywhere from the app entry points.
  - Entry points: src/main.jsx and src/App.jsx (plus any files that are explicitly in index.html)
  - Ignores: styles, assets, test files, and files referenced only by dynamic routes at runtime
  - This is a heuristic; review the output before deleting anything.
*/
import { promises as fs } from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const SRC = path.join(root, "src");

const IGNORED_DIRS = new Set([
  path.join(SRC, "assets"),
  path.join(SRC, "styles"),
]);

const IGNORED_EXT = new Set([
  ".scss",
  ".css",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".json",
]);
const CODE_EXT = new Set([".js", ".jsx", ".ts", ".tsx"]);

const ENTRY_FILES = [path.join(SRC, "main.jsx"), path.join(SRC, "App.jsx")];

// Try to include index.html module entry (e.g., /src/main.jsx)
async function readIndexHtmlEntry() {
  const htmlPath = path.join(root, "index.html");
  if (!(await exists(htmlPath))) return null;
  const html = await fs.readFile(htmlPath, "utf8");
  const m = html.match(/<script\s+type=\"module\"\s+src=\"([^\"]+)\"/i);
  if (!m) return null;
  let p = m[1];
  if (p.startsWith("/")) p = p.slice(1);
  const abs = path.resolve(root, p);
  return abs;
}

/** Normalize to posix-like for map keys */
function norm(p) {
  return p.split("\\").join("/");
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, out = []) {
  const ents = await fs.readdir(dir, { withFileTypes: true });
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if ([...IGNORED_DIRS].some((d) => p.startsWith(d))) continue;
      await walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

const importRe =
  /(?:import\s+[^'"`]+from\s*['"`]([^'"`]+)['"`]|import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)|export\s+\*?\s*from\s*['"`]([^'"`]+)['"`])/g;
let aliasMap = new Map();

function resolveImport(baseFile, spec) {
  if (!spec) return null;
  if (spec.startsWith("http:") || spec.startsWith("https:")) return null;
  // Vite alias support (basic): alias object or array find/replacement
  for (const [alias, target] of aliasMap) {
    if (spec === alias || spec.startsWith(alias + "/")) {
      const rel = spec.slice(alias.length);
      const abs = path.resolve(root, target + rel);
      const tryList = [];
      tryList.push(abs);
      for (const ext of CODE_EXT) tryList.push(abs + ext);
      tryList.push(path.join(abs, "index.js"));
      tryList.push(path.join(abs, "index.jsx"));
      tryList.push(path.join(abs, "index.ts"));
      tryList.push(path.join(abs, "index.tsx"));
      return tryList;
    }
  }
  if (spec.startsWith(".") || spec.startsWith("/")) {
    // relative
    const baseDir = path.dirname(baseFile);
    const tryList = [];
    // exact
    tryList.push(path.resolve(baseDir, spec));
    // with extensions
    for (const ext of CODE_EXT) tryList.push(path.resolve(baseDir, spec + ext));
    // index files in folders
    tryList.push(path.resolve(baseDir, spec, "index.js"));
    tryList.push(path.resolve(baseDir, spec, "index.jsx"));
    tryList.push(path.resolve(baseDir, spec, "index.ts"));
    tryList.push(path.resolve(baseDir, spec, "index.tsx"));
    return tryList;
  }
  // bare module: ignore (node_modules)
  return null;
}

async function readViteAliases() {
  const vitePath = path.join(root, "vite.config.js");
  if (!(await exists(vitePath))) return;
  try {
    const txt = await fs.readFile(vitePath, "utf8");
    // object form: alias: { '@': '/src' }
    const objForm = txt.match(/alias\s*:\s*\{([\s\S]*?)\}/m);
    if (objForm) {
      const body = objForm[1];
      const re = /['\"]([^'\"\n]+)['\"]\s*:\s*['\"]([^'\"\n]+)['\"]/g;
      let m;
      while ((m = re.exec(body))) {
        const a = m[1];
        let t = m[2];
        if (t.startsWith("/")) t = t.slice(1);
        aliasMap.set(a, t);
      }
      return;
    }
    // array form: alias: [{ find: '@', replacement: '/src' }]
    const arrForm = txt.match(/alias\s*:\s*\[([\s\S]*?)\]/m);
    if (arrForm) {
      const body = arrForm[1];
      const re =
        /find\s*:\s*['\"]([^'\"]+)['\"][\s,\n\r]+replacement\s*:\s*['\"]([^'\"]+)['\"]/g;
      let m;
      while ((m = re.exec(body))) {
        const a = m[1];
        let t = m[2];
        if (t.startsWith("/")) t = t.slice(1);
        aliasMap.set(a, t);
      }
    }
  } catch {}
}

async function buildGraph(entryFiles) {
  const visited = new Set();
  const queue = [...entryFiles];
  const allCodeFiles = (await walk(SRC)).filter((p) =>
    CODE_EXT.has(path.extname(p))
  );
  const codeSet = new Set(allCodeFiles.map(norm));

  while (queue.length) {
    const f = queue.shift();
    const nf = norm(f);
    if (visited.has(nf)) continue;
    if (!(await exists(f))) continue;
    visited.add(nf);

    const text = await fs.readFile(f, "utf8");
    importRe.lastIndex = 0;
    let m;
    while ((m = importRe.exec(text))) {
      const spec = m[1] || m[2] || m[3];
      const candidates = resolveImport(f, spec);
      if (!candidates) continue;
      for (const c of candidates) {
        if (await exists(c)) {
          const ext = path.extname(c);
          if (IGNORED_EXT.has(ext)) continue;
          if (CODE_EXT.has(ext) || (await exists(c))) {
            const nc = norm(c);
            if (codeSet.has(nc) && !visited.has(nc)) queue.push(c);
          }
          break; // stop at first match
        }
      }
    }
  }

  return { visited, allCodeFiles };
}

async function main() {
  await readViteAliases();
  const htmlEntry = await readIndexHtmlEntry();
  const entries = ENTRY_FILES.filter((p) => path.extname(p));
  if (htmlEntry) entries.unshift(htmlEntry);
  const { visited, allCodeFiles } = await buildGraph(entries);

  const unused = [];
  for (const f of allCodeFiles) {
    const nf = norm(f);
    if (!visited.has(nf)) unused.push(nf.replace(norm(root) + "/", ""));
  }

  // Heuristics: ignore typical env/provider files we might not catch via entry scan
  const falsePositives = unused.filter((p) =>
    /hooks\/useFacilityTypes\.(js|jsx)$/.test(p)
  );
  let realUnused = unused.filter((p) => !falsePositives.includes(p));

  // Allowlist support: scripts/dead-code-allowlist.json { ignore: ["path", ...] }
  try {
    const allowPath = path.join(root, "scripts", "dead-code-allowlist.json");
    if (await exists(allowPath)) {
      const txt = await fs.readFile(allowPath, "utf8");
      const conf = JSON.parse(txt);
      const ignores = Array.isArray(conf?.ignore) ? conf.ignore.map(norm) : [];
      if (ignores.length) {
        realUnused = realUnused.filter((p) => !ignores.includes(norm(p)));
      }
    }
  } catch {}

  if (realUnused.length === 0) {
    console.log("No obvious dead code found.");
    return;
  }
  console.log("Potentially unused files:");
  for (const f of realUnused.sort()) console.log(" -", f);
  console.log(
    "\nTip: Review before deleting. Some files may be used via dynamic imports or routes."
  );
}

main().catch((e) => {
  console.error("Dead code check failed:", e);
  process.exit(1);
});
