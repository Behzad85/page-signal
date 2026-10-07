import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { inspectFiles, publicFiles } from "./check-public.mjs";

const root = process.cwd();
const destination = resolve(root, "output/public-release");
const files = publicFiles(root).filter((file) => !file.startsWith(".claude/") && !file.startsWith(".codex/") && !file.startsWith(".agents/"));
const findings = inspectFiles(root, files);
if (findings.length) {
  console.error("Export refused: run npm run check:public and resolve its findings first.");
  process.exit(1);
}
if (existsSync(destination)) {
  console.error("Export refused: output/public-release already exists. Move it aside before creating a fresh snapshot.");
  process.exit(1);
}
mkdirSync(destination, { recursive: true });
for (const file of files) {
  mkdirSync(dirname(join(destination, file)), { recursive: true });
  cpSync(join(root, file), join(destination, file), { errorOnExist: true, force: false });
}
console.log(`Prepared ${files.length} files in ${destination}, without Git history, ignored secrets, or local scratch files.`);
console.log("This is a review candidate. Complete docs/PUBLIC_RELEASE.md before publishing; rights and credential revocation are not automated.");
