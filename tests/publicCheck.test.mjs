import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publicFiles, sensitiveContent } from "../scripts/check-public.mjs";

test("public-file check catches embedded secrets without returning their values", () => {
  const token = "synthetic".repeat(5);
  const source = `const SERVICE_TOKEN = "${token}";`;
  const findings = sensitiveContent(source);
  assert.deepEqual(findings, [{ line: 1, rule: "literal credential" }]);
  assert.ok(!JSON.stringify(findings).includes(token));
  assert.deepEqual(sensitiveContent(`asset?${"_jwt="}${"eyJ"}${"a".repeat(30)}`), [{ line: 1, rule: "signed asset link" }]);
});

test("public-file check allows empty configuration and environment references", () => {
  assert.deepEqual(sensitiveContent('SERVICE_TOKEN=\nconst token = process.env.SERVICE_TOKEN;'), []);
});

test("public-file check refuses a nested export instead of reporting an empty clean scan", (t) => {
  const root = mkdtempSync(join(tmpdir(), "optiscan-public-check-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "--quiet", root]);
  writeFileSync(join(root, ".gitignore"), "output/\n");
  writeFileSync(join(root, "README.md"), "Example source\n");
  const nested = join(root, "output", "public-release");
  mkdirSync(nested, { recursive: true });
  assert.deepEqual(publicFiles(root), [".gitignore", "README.md"]);
  assert.throws(() => publicFiles(nested), /repository root/);
});
