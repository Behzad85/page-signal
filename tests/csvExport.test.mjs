import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { rowsToCsv, rowsToTable } = await jiti.import("../components/optiscan/utils.js");

test("CSV export neutralizes spreadsheet formulas from untrusted website content", () => {
  const csv = rowsToCsv([{ A: "=1+1", B: "+1+1", C: "-1+1", D: "@SUM(1)", E: "\t=1+1", F: " \r=1+1" }]);
  assert.equal(csv, "A,B,C,D,E,F\n'=1+1,'+1+1,'-1+1,'@SUM(1),'=1+1,'=1+1");
});

test("CSV export preserves ordinary text, numeric values, commas and quotes", () => {
  assert.equal(rowsToCsv([{ Title: "Page title", Score: 81, Note: 'One, "two"' }]), 'Title,Score,Note\nPage title,81,"One, ""two"""');
});

test("copied tables keep formula-like headings and values as spreadsheet text", () => {
  assert.equal(rowsToTable([{ "=header": " \t=1+1", Title: "Ordinary title" }]), "'=header\tTitle\n'=1+1\tOrdinary title");
});

test("copied tables preserve literal quotes around a formula-looking value", () => {
  assert.equal(rowsToTable([{ Title: '"=1+1"' }]), 'Title\n"""=1+1"""');
});
