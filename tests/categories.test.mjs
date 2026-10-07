import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const categoriesUrl = new URL("../components/optiscan/categories.js", import.meta.url);

test("classifies representative category evidence states", async () => {
  const jiti = createJiti(import.meta.url, { interopDefault: true, jsx: true });
  const { categoryEvidenceStatus } = await jiti.import(fileURLToPath(categoriesUrl));

  assert.equal(categoryEvidenceStatus("Crawler access blocked with a 403 response."), "critical");
  assert.equal(categoryEvidenceStatus("Canonical tag is missing."), "missing");
  assert.equal(categoryEvidenceStatus("Backlink evidence is not connected."), "not_measured");
  assert.equal(categoryEvidenceStatus("Content is thin and needs improvement."), "warning");
  assert.equal(categoryEvidenceStatus("Sitemap: present."), "ok");
});

test("prefers an explicit normalized evidence status over text inference", async () => {
  const jiti = createJiti(import.meta.url, { interopDefault: true, jsx: true });
  const { categoryEvidenceStatus } = await jiti.import(fileURLToPath(categoriesUrl));

  assert.equal(categoryEvidenceStatus({ text: "Sitemap: present.", status: "critical" }), "critical");
  assert.equal(categoryEvidenceStatus({ text: "Crawler blocked.", status: "ok" }), "ok");
});

test("exposes category display status as statusText", async () => {
  const jiti = createJiti(import.meta.url, { interopDefault: true, jsx: true });
  const { buildSeoCategories } = await jiti.import(fileURLToPath(categoriesUrl));
  const [category] = buildSeoCategories("site", {}, []);

  assert.equal(typeof category.statusText, "string");
  assert.equal(Object.hasOwn(category, "statusLabel"), false);
});
