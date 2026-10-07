import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const rules = [
  ["provider credential", /(?:sk-(?:proj-)?[A-Za-z0-9_-]{24,}|AIza[A-Za-z0-9_-]{30,}|gh[pousr]_[A-Za-z0-9]{30,})/],
  ["literal credential", /\b[A-Z_]*(?:TOKEN|SECRET|PASSWORD|API_KEY)["']?\s*[:=]\s*["'](?!your_|example|test)[A-Za-z0-9/+_=-]{20,}["']/i],
  ["signed asset link", /[?&]_jwt=eyJ[A-Za-z0-9_.-]+/],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
];

export function sensitiveContent(text) {
  return String(text).split(/\r?\n/).flatMap((line, index) =>
    rules.filter(([, pattern]) => pattern.test(line)).map(([rule]) => ({ line: index + 1, rule }))
  );
}

export function publicFiles(root) {
  const message = "Public-file checks require the repository root. Initialize an exported snapshot as a new Git repository before scanning it.";
  let repositoryRoot;
  try {
    repositoryRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    throw new Error(message);
  }
  if (realpathSync(repositoryRoot) !== realpathSync(root)) throw new Error(message);
  // Include new work but respect ignores. Never assume .gitignore removes
  // something already tracked; the checks below still inspect tracked files.
  return [...new Set(execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean))]
    .filter((file) => {
      try { return lstatSync(resolve(root, file)).isFile() || lstatSync(resolve(root, file)).isSymbolicLink(); }
      catch (error) { if (error.code === "ENOENT") return false; throw error; }
    }).sort();
}

export function inspectFiles(root, files) {
  const findings = [];
  for (const file of files) {
    const path = resolve(root, file);
    if (lstatSync(path).isSymbolicLink()) {
      findings.push({ file, rule: "symlink requires manual publication review" });
      continue;
    }
    if ((basename(file).startsWith(".env") && basename(file) !== ".env.example") || /\.(pem|key)$/i.test(file) || file.startsWith(".local-only/")) {
      findings.push({ file, rule: "private configuration file" });
      continue;
    }
    const bytes = readFileSync(path);
    if (!bytes.includes(0)) findings.push(...sensitiveContent(bytes.toString("utf8")).map((item) => ({ file, ...item })));
  }
  return findings;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const files = publicFiles(process.cwd());
  const findings = inspectFiles(process.cwd(), files);
  for (const finding of findings) console.error(`${finding.file}${finding.line ? `:${finding.line}` : ""}: ${finding.rule} (value redacted)`);
  console.log(`Public-file check: ${files.length} files, ${findings.length} findings. Pattern-based check only; Git history and publication rights require separate review.`);
  process.exitCode = findings.length ? 1 : 0;
}
