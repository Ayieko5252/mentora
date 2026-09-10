import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Directory of this module when running as real ESM (local dev / `node`). When
// the code is bundled to CJS by esbuild (Netlify Functions), esbuild replaces
// import.meta.url with an empty string, so guard against that and fall back to
// the runtime task root instead of throwing at load time.
function moduleDir() {
  try {
    const url = import.meta.url;
    if (url) return path.dirname(fileURLToPath(url));
  } catch {
    /* import.meta not available in this format */
  }
  return null;
}

const MODULE_DIR = moduleDir();
const SERVER_ROOT = MODULE_DIR ? path.resolve(MODULE_DIR, "../..") : null;

// Resolves a path under server/ in both environments: locally (relative to this
// file) and inside a bundled Netlify Function, where included_files keep their
// repo-relative paths ("server/…") under the function's task root.
export function serverPath(...segments) {
  const taskRoot = process.env.LAMBDA_TASK_ROOT || process.cwd();
  const candidates = [
    SERVER_ROOT ? path.join(SERVER_ROOT, ...segments) : null,
    path.join(taskRoot, "server", ...segments),
    path.join(process.cwd(), "server", ...segments),
    path.join(process.cwd(), ...segments),
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[candidates.length - 1];
}
