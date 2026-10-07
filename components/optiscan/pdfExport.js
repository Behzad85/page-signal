import { MODE_LABELS } from "./constants";
import { reportSections } from "./reportRows";
import { tableHeaders, textValue } from "./utils";

const PDF_TONES = {
  healthy: [0.16, 0.46, 0.33],
  warning: [0.57, 0.38, 0.05],
  critical: [0.70, 0.19, 0.26],
  info: [0.13, 0.59, 0.95],
  slate: [0.39, 0.45, 0.55],
  ink: [0.13, 0.17, 0.21],
  muted: [0.38, 0.44, 0.54],
  soft: [0.96, 0.96, 0.94],
  border: [0.73, 0.78, 0.86],
};

function clampScore(value) {
  const number = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : null;
}

function toneForStatus(value) {
  const text = String(value || "").toLowerCase();
  if (/\b(good|healthy|present|pass|ok|available)\b/.test(text)) return PDF_TONES.healthy;
  if (/\b(critical|poor|missing|failed|invalid|blocked)\b/.test(text)) return PDF_TONES.critical;
  if (/\b(needs|warning|lab|restricted|disabled|quota|focus)\b/.test(text)) return PDF_TONES.warning;
  if (/\b(info|informational)\b/.test(text)) return PDF_TONES.info;
  return PDF_TONES.slate;
}

function toneForNumericScore(score) {
  if (!Number.isFinite(score)) return PDF_TONES.slate;
  if (score >= 80) return PDF_TONES.healthy;
  if (score >= 55) return PDF_TONES.warning;
  return PDF_TONES.critical;
}

function pdfEscape(value) {
  return textValue(value)
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapPdfText(value, maxChars) {
  const text = textValue(value);
  if (!text) {
    return [""];
  }

  const lines = [];
  let current = "";
  text.split(/\s+/).forEach((word) => {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let index = 0; index < word.length; index += maxChars) {
        lines.push(word.slice(index, index + maxChars));
      }
      return;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines;
}

const HELVETICA_ASCII_WIDTHS = Object.freeze({
  " ": 278,
  "!": 278,
  '"': 355,
  "#": 556,
  $: 556,
  "%": 889,
  "&": 667,
  "'": 191,
  "(": 333,
  ")": 333,
  "*": 389,
  "+": 584,
  ",": 278,
  "-": 333,
  ".": 278,
  "/": 278,
  0: 556,
  1: 556,
  2: 556,
  3: 556,
  4: 556,
  5: 556,
  6: 556,
  7: 556,
  8: 556,
  9: 556,
  ":": 278,
  ";": 278,
  "<": 584,
  "=": 584,
  ">": 584,
  "?": 556,
  "@": 1015,
  A: 667,
  B: 667,
  C: 722,
  D: 722,
  E: 667,
  F: 611,
  G: 778,
  H: 722,
  I: 278,
  J: 500,
  K: 667,
  L: 556,
  M: 833,
  N: 722,
  O: 778,
  P: 667,
  Q: 778,
  R: 722,
  S: 667,
  T: 611,
  U: 722,
  V: 667,
  W: 944,
  X: 667,
  Y: 667,
  Z: 611,
  "[": 278,
  "\\": 278,
  "]": 278,
  "^": 469,
  _: 556,
  "`": 333,
  a: 556,
  b: 556,
  c: 500,
  d: 556,
  e: 556,
  f: 278,
  g: 556,
  h: 556,
  i: 222,
  j: 222,
  k: 500,
  l: 222,
  m: 833,
  n: 556,
  o: 556,
  p: 556,
  q: 556,
  r: 333,
  s: 500,
  t: 278,
  u: 556,
  v: 500,
  w: 722,
  x: 500,
  y: 500,
  z: 500,
  "{": 334,
  "|": 260,
  "}": 334,
  "~": 584,
});

function printableAscii(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "");
}

export function measureHelveticaText(value, fontSize = 8.5) {
  const units = [...printableAscii(value)].reduce(
    (total, character) => total + (HELVETICA_ASCII_WIDTHS[character] ?? 556),
    0
  );
  return (units * fontSize) / 1000;
}

function splitHelveticaWord(word, maxWidth, fontSize) {
  const pieces = [];
  let piece = "";
  let pieceWidth = 0;

  [...word].forEach((character) => {
    const characterWidth = measureHelveticaText(character, fontSize);
    if (piece && pieceWidth + characterWidth > maxWidth) {
      pieces.push(piece);
      piece = character;
      pieceWidth = characterWidth;
    } else {
      piece += character;
      pieceWidth += characterWidth;
    }
  });

  if (piece) {
    pieces.push(piece);
  }

  return pieces;
}

function wrapHelveticaText(value, maxWidth, fontSize) {
  const text = printableAscii(textValue(value));
  if (!text) {
    return [""];
  }

  const lines = [];
  const spaceWidth = measureHelveticaText(" ", fontSize);
  let current = "";
  let currentWidth = 0;

  text.split(/\s+/).forEach((word) => {
    const wordWidth = measureHelveticaText(word, fontSize);
    if (current && currentWidth + spaceWidth + wordWidth <= maxWidth) {
      current += ` ${word}`;
      currentWidth += spaceWidth + wordWidth;
      return;
    }

    if (current) {
      lines.push(current);
      current = "";
      currentWidth = 0;
    }

    if (wordWidth <= maxWidth) {
      current = word;
      currentWidth = wordWidth;
      return;
    }

    const pieces = splitHelveticaWord(word, maxWidth, fontSize);
    lines.push(...pieces.slice(0, -1));
    current = pieces.at(-1) || "";
    currentWidth = measureHelveticaText(current, fontSize);
  });

  if (current) {
    lines.push(current);
  }

  return lines;
}

export function buildPdfBlob(mode, result) {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const bottomMargin = 40;
  const pages = [];
  let currentPage = { commands: [] };
  let y = pageHeight - margin;

  function addCommand(command) {
    currentPage.commands.push(command);
  }

  function addPage() {
    pages.push(currentPage);
    currentPage = { commands: [] };
    y = pageHeight - margin;
  }

  function color(values, operator) {
    return `${values.map((value) => Number(value).toFixed(3)).join(" ")} ${operator}`;
  }

  function addText(text, x, textY, size = 9, font = "F1", fill = [0.12, 0.16, 0.22]) {
    addCommand(`BT ${color(fill, "rg")} /${font} ${size} Tf ${x.toFixed(2)} ${textY.toFixed(2)} Td (${pdfEscape(text)}) Tj ET`);
  }

  function addRect(x, rectY, width, height, fill, stroke = [0.82, 0.86, 0.92]) {
    if (fill) {
      addCommand(`q ${color(fill, "rg")} ${x.toFixed(2)} ${rectY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f Q`);
    }
    addCommand(`q ${color(stroke, "RG")} 0.5 w ${x.toFixed(2)} ${rectY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S Q`);
  }

  function addFilledRect(x, rectY, width, height, fill) {
    addCommand(`q ${color(fill, "rg")} ${x.toFixed(2)} ${rectY.toFixed(2)} ${Math.max(0, width).toFixed(2)} ${height.toFixed(2)} re f Q`);
  }

  function ensureSpace(height) {
    if (y - height < bottomMargin) {
      addPage();
    }
  }

  function textLines(value, width, size, maxLines = 8) {
    const maxChars = Math.max(8, Math.floor(width / (size * 0.52)));
    const lines = wrapPdfText(value, maxChars);

    if (lines.length <= maxLines) {
      return lines;
    }

    return [...lines.slice(0, maxLines - 1), `${lines[maxLines - 1].replace(/\s+$/g, "")} ...`];
  }

  function columnWeight(header) {
    const key = String(header || "").toLowerCase();
    if (["item", "ok", "score", "words", "h1 count", "h2 count"].includes(key)) return 0.55;
    if (["status", "priority", "source", "section", "field", "metric"].includes(key)) return 0.95;
    if (["url", "schema", "schema types"].includes(key)) return 1.45;
    if (["value", "detail", "summary", "note", "impact", "method", "evidence"].includes(key)) return 2;
    return 1.2;
  }

  function sectionRows(section) {
    return section.rows.length ? section.rows : [{ Note: "No rows available." }];
  }

  function cleanedTableHeaders(rows, preferredHeaders = []) {
    const naturalHeaders = preferredHeaders.length ? preferredHeaders : tableHeaders(rows);
    return naturalHeaders.filter((header) => rows.some((row) => textValue(row[header])));
  }

  function tableColumnWidths(headers) {
    const weights = headers.map(columnWeight);
    const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    return weights.map((weight) => (contentWidth * weight) / total);
  }

  function drawTableHeader(headers, widths) {
    const headerHeight = 24;
    ensureSpace(headerHeight + 12);
    addRect(margin, y - headerHeight, contentWidth, headerHeight, [0.93, 0.96, 0.97], [0.73, 0.78, 0.86]);

    let x = margin;
    headers.forEach((header, index) => {
      addText(header, x + 5, y - 15, 8, "F2", [0.22, 0.27, 0.35]);
      if (index > 0) {
        addCommand(`q ${color([0.73, 0.78, 0.86], "RG")} 0.5 w ${x.toFixed(2)} ${(y - headerHeight).toFixed(2)} m ${x.toFixed(2)} ${y.toFixed(2)} l S Q`);
      }
      x += widths[index];
    });

    y -= headerHeight;
  }

  function drawRow(row, headers, widths) {
    const cellPadding = 5;
    const fontSize = 7.5;
    const leading = 10;
    const cellLineSets = headers.map((header, index) => textLines(row[header], widths[index] - cellPadding * 2, fontSize, 9));
    const maxLineCount = Math.max(...cellLineSets.map((lines) => lines.length), 1);
    const rowHeight = Math.max(24, maxLineCount * leading + cellPadding * 2);

    if (y - rowHeight < bottomMargin) {
      addPage();
      drawTableHeader(headers, widths);
    }

    addRect(margin, y - rowHeight, contentWidth, rowHeight, null, [0.84, 0.88, 0.94]);

    let x = margin;
    headers.forEach((header, index) => {
      const lines = cellLineSets[index];
      if (index > 0) {
        addCommand(`q ${color([0.84, 0.88, 0.94], "RG")} 0.5 w ${x.toFixed(2)} ${(y - rowHeight).toFixed(2)} m ${x.toFixed(2)} ${y.toFixed(2)} l S Q`);
      }
      lines.forEach((line, lineIndex) => {
        addText(line, x + cellPadding, y - cellPadding - fontSize - lineIndex * leading, fontSize, "F1", [0.13, 0.16, 0.21]);
      });
      x += widths[index];
    });

    y -= rowHeight;
  }

  function drawSectionTitle(title) {
    ensureSpace(56);
    y -= 8;
    addText(title, margin, y, 13, "F2", [0.05, 0.1, 0.18]);
    y -= 16;
  }

  function drawScoreBar(label, value, status = "", options = {}) {
    const score = clampScore(value);
    if (!Number.isFinite(score)) {
      return;
    }

    const width = options.width || contentWidth;
    const x = options.x || margin;
    const barWidth = width - 86;
    const tone = toneForNumericScore(score);
    ensureSpace(32);
    addText(label, x, y, 8.5, "F2", PDF_TONES.ink);
    addText(`${score}/100`, x + width - 50, y, 9, "F2", tone);
    if (status) {
      addText(status, x + width - 120, y, 7.5, "F1", toneForStatus(status));
    }
    y -= 10;
    addFilledRect(x, y - 7, barWidth, 7, [0.9, 0.93, 0.96]);
    addFilledRect(x, y - 7, barWidth * (score / 100), 7, tone);
    y -= 16;
  }

  function drawMetricTiles(items, columns = 4) {
    const list = items.filter((item) => textValue(item.value) || textValue(item.status));
    if (!list.length) {
      return;
    }

    const gap = 8;
    const colCount = Math.min(columns, list.length);
    const tileWidth = (contentWidth - gap * (colCount - 1)) / colCount;
    const tileHeight = 52;

    for (let index = 0; index < list.length; index += colCount) {
      const chunk = list.slice(index, index + colCount);
      ensureSpace(tileHeight + 12);
      chunk.forEach((item, chunkIndex) => {
        const x = margin + chunkIndex * (tileWidth + gap);
        const tone = toneForStatus(item.status || item.value);
        addRect(x, y - tileHeight, tileWidth, tileHeight, [0.97, 0.98, 0.99], [0.82, 0.86, 0.92]);
        addFilledRect(x, y - tileHeight, 3, tileHeight, tone);
        addText(item.label, x + 9, y - 13, 7.2, "F2", PDF_TONES.muted);
        addText(item.value, x + 9, y - 29, 11, "F2", PDF_TONES.ink);
        if (item.status) {
          addText(item.status, x + 9, y - 43, 7.2, "F1", tone);
        }
      });
      y -= tileHeight + 12;
    }
  }

  function drawCategoryVisualRows(rows) {
    if (!rows.length) {
      return;
    }

    ensureSpace(34);
    addText("Audit Category Snapshot", margin, y, 10, "F2", PDF_TONES.ink);
    y -= 14;

    rows.forEach((row) => {
      const rowHeight = 58;
      const tone = toneForStatus(row.Status);
      ensureSpace(rowHeight + 8);
      addRect(margin, y - rowHeight, contentWidth, rowHeight, [0.98, 0.99, 1], [0.84, 0.88, 0.94]);
      addFilledRect(margin, y - rowHeight, 4, rowHeight, tone);
      addText(row.Category || "SEO Category", margin + 12, y - 14, 9.5, "F2", PDF_TONES.ink);
      addText(row.Status || "Unknown", margin + 12, y - 29, 8, "F2", tone);
      addText(`OK ${row["Healthy Signals"] || 0}`, margin + 150, y - 14, 8, "F2", PDF_TONES.healthy);
      addText(`Issues ${row.Issues || 0}`, margin + 205, y - 14, 8, "F2", PDF_TONES.warning);
      addText(`Tickets ${row.Tickets || 0}`, margin + 272, y - 14, 8, "F2", PDF_TONES.slate);
      const evidence = textLines(row.Evidence || row.Recommendation, contentWidth - 160, 7.4, 2);
      evidence.forEach((line, index) => {
        addText(line, margin + 150, y - 30 - index * 10, 7.4, "F1", PDF_TONES.muted);
      });
      y -= rowHeight + 8;
    });
    y -= 6;
  }

  function drawScoreboardChart(rows) {
    if (!rows.length) {
      return;
    }

    ensureSpace(34);
    addText("Scoreboard", margin, y, 10, "F2", PDF_TONES.ink);
    y -= 14;
    rows.forEach((row) => {
      const score = clampScore(row.Score);
      const tone = toneForNumericScore(score);
      const label = row.Site || row.URL || `Site ${row.Item || ""}`;
      ensureSpace(28);
      addText(label, margin, y, 8.2, "F2", PDF_TONES.ink);
      addText(Number.isFinite(score) ? `${score}/100` : "No score", margin + contentWidth - 48, y, 8.2, "F2", tone);
      y -= 9;
      addFilledRect(margin, y - 7, contentWidth - 72, 7, [0.9, 0.93, 0.96]);
      if (Number.isFinite(score)) {
        addFilledRect(margin, y - 7, (contentWidth - 72) * (score / 100), 7, tone);
      }
      addText(`OK ${row.OK || 0}  Issues ${row["Not OK"] || 0}  Words ${row.Words || 0}`, margin + contentWidth - 180, y - 1, 7, "F1", PDF_TONES.muted);
      y -= 16;
    });
    y -= 4;
  }

  function drawLighthouseCategoryChart(rows) {
    const list = rows.filter((row) => clampScore(row.Score) !== null);
    if (!list.length) {
      return;
    }

    ensureSpace(34);
    addText("Lighthouse Category Scores", margin, y, 10, "F2", PDF_TONES.ink);
    y -= 14;
    list.forEach((row) => {
      const label = `${row.Device ? `${row.Device} ` : ""}${row.Category || "Category"}`;
      drawScoreBar(label, row.Score, "", { width: contentWidth });
    });
    y -= 4;
  }

  function drawWrappedBlock(value, x = margin, width = contentWidth, size = 8.5, font = "F1", fill = [0.18, 0.23, 0.31], maxLines = 14) {
    const lines = textLines(value, width, size, maxLines);
    const leading = size + 4;
    ensureSpace(lines.length * leading + 4);
    lines.forEach((line, index) => {
      addText(line, x, y - index * leading, size, font, fill);
    });
    y -= lines.length * leading + 4;
  }

  function drawParagraph(label, value) {
    const body = textValue(value);
    if (!body) {
      return;
    }

    ensureSpace(38);
    addText(label, margin, y, 9, "F2", [0.16, 0.21, 0.29]);
    y -= 12;
    drawWrappedBlock(body);
    y -= 18;
  }

  function drawKeyValue(label, value) {
    const body = textValue(value);
    if (!body) {
      return;
    }

    const labelWidth = 130;
    const valueWidth = contentWidth - labelWidth - 12;
    const lines = textLines(body, valueWidth, 8.2, 8);
    const rowHeight = Math.max(18, lines.length * 11);
    ensureSpace(rowHeight + 3);
    addText(label, margin, y, 8.5, "F2", [0.18, 0.23, 0.31]);
    lines.forEach((line, index) => {
      addText(line, margin + labelWidth, y - index * 11, 8.2, "F1", [0.26, 0.31, 0.4]);
    });
    y -= rowHeight + 3;
  }

  function rowLabel(row, fallback) {
    return textValue(row.Metric || row.Field || row.Title || row.Area || row.Section || row.Ticket || row.Item || fallback);
  }

  function rowBody(row) {
    const skip = new Set(["Section", "Metric", "Field", "Title", "Area", "Ticket", "Item"]);
    const priority = ["Value", "Status", "Summary", "Note", "Detail", "Finding", "Issue", "Impact", "Evidence", "Method", "Advantage"];
    const parts = [];

    priority.forEach((key) => {
      const value = textValue(row[key]);
      if (value) {
        parts.push(key === "Value" ? value : `${key}: ${value}`);
      }
    });

    Object.entries(row).forEach(([key, value]) => {
      if (!skip.has(key) && !priority.includes(key) && textValue(value)) {
        parts.push(`${key}: ${textValue(value)}`);
      }
    });

    return parts.join(" | ");
  }

  function splitListItems(value) {
    return textValue(value)
      .split(/;\s+|\n+/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function drawBullets(items) {
    items.filter(Boolean).forEach((item) => {
      const lines = textLines(item, contentWidth - 14, 8.2, 6);
      const leading = 11;
      ensureSpace(lines.length * leading + 2);
      addText("-", margin, y, 8.2, "F2", [0.16, 0.21, 0.29]);
      lines.forEach((line, index) => {
        addText(line, margin + 14, y - index * leading, 8.2, "F1", [0.22, 0.27, 0.36]);
      });
      y -= lines.length * leading + 4;
    });
  }

  function drawNarrativeRows(rows) {
    rows.forEach((row, index) => {
      const label = rowLabel(row, `Item ${index + 1}`);
      const body = rowBody(row);
      if (body.length > 90 || /summary|takeaway|gap|readiness|story|details|criteria/i.test(label)) {
        drawParagraph(label, body);
      } else {
        drawKeyValue(label, body);
      }
    });
  }

  function drawTableRows(rows, preferredHeaders = []) {
    const safeRows = rows.length ? rows : [{ Note: "No rows available." }];
    const headers = cleanedTableHeaders(safeRows, preferredHeaders);
    if (!headers.length) {
      drawParagraph("No data", "No rows available.");
      return;
    }

    const widths = tableColumnWidths(headers);
    drawTableHeader(headers, widths);
    safeRows.forEach((row) => drawRow(row, headers, widths));
    y -= 18;
  }

  function drawOverviewSection(rows) {
    const scoreboardRows = rows.filter((row) => row.Section === "Scoreboard");
    const crawledPageRows = rows.filter((row) => row.Section === "Crawled Pages");
    const categoryRows = rows.filter((row) => row.Section === "SEO Categories");
    const narrativeRows = rows.filter((row) => !["Scoreboard", "Crawled Pages", "SEO Categories"].includes(row.Section));
    const healthRow = narrativeRows.find((row) => /health score/i.test(textValue(row.Metric)));
    const statRows = narrativeRows
      .filter((row) => ["OK Items", "Not OK Items", "Tickets", "Crawl Sample", "Discovered URLs", "Repeated Root-Cause Signals", "Technical Issues", "Suggested Topics", "Next Actions"].includes(textValue(row.Metric)))
      .slice(0, 4);
    const visualMetricLabels = new Set([healthRow?.Metric, ...statRows.map((row) => row.Metric)].filter(Boolean));
    const narrativeOnlyRows = narrativeRows.filter((row) => !visualMetricLabels.has(row.Metric));

    if (healthRow) {
      drawScoreBar("Health Score", healthRow.Value, healthRow.Status);
      drawMetricTiles(
        statRows.map((row) => ({
          label: row.Metric,
          value: row.Value,
          status: row.Status,
        })),
        4
      );
    }

    drawNarrativeRows(narrativeOnlyRows);
    drawCategoryVisualRows(categoryRows);

    if (crawledPageRows.length) {
      ensureSpace(32);
      addText("Pages Crawled", margin, y, 10, "F2", [0.16, 0.21, 0.29]);
      y -= 14;
      drawTableRows(crawledPageRows, ["Item", "URL", "Status", "HTTP Status", "Words", "H1 Count", "H2 Count", "Schema", "Source"]);
    }

    if (scoreboardRows.length) {
      drawScoreboardChart(scoreboardRows);
      drawTableRows(scoreboardRows, ["Site", "Score", "OK", "Not OK", "Words", "Schema Types"]);
    }
  }

  function drawContentStrategySection(rows) {
    const topicRows = rows.filter((row) => row.Section === "Missing Topics");
    const narrativeRows = rows.filter((row) => row.Section !== "Missing Topics");

    drawNarrativeRows(narrativeRows);

    if (topicRows.length) {
      ensureSpace(32);
      addText("Missing Topics", margin, y, 9, "F2", [0.16, 0.21, 0.29]);
      y -= 14;
      drawBullets(topicRows.map((row) => row.Detail || row.Value || row.Note));
      y -= 10;
    }
  }

  function drawCoreWebVitalsSection(rows) {
    const categoryRows = rows.filter((row) => row.Section === "Lighthouse Category Scores");
    const metricRows = rows.filter((row) => row["Full Name"] || row["Good Target"]);
    const diagnosticRows = rows.filter((row) => row.Diagnostic);
    const summaryRows = rows.filter((row) => !categoryRows.includes(row) && !metricRows.includes(row) && !diagnosticRows.includes(row));

    drawNarrativeRows(summaryRows);
    drawLighthouseCategoryChart(categoryRows);

    if (metricRows.length) {
      ensureSpace(32);
      addText("Metric Results", margin, y, 10, "F2", [0.16, 0.21, 0.29]);
      y -= 14;
      drawMetricTiles(
        metricRows.slice(0, 8).map((row) => ({
          label: [row.Device, row["Full Name"] || row.Metric].filter(Boolean).join(" "),
          value: row.Value,
          status: row.Status,
        })),
        2
      );
      drawTableRows(
        metricRows.map((row) => ({
          Source: row.Source,
          Metric: row["Full Name"] || row.Metric,
          Value: row.Value,
          Status: row.Status,
          Target: row["Good Target"],
        })),
        ["Source", "Metric", "Value", "Status", "Target"]
      );

      metricRows.forEach((row) => {
        drawParagraph(row["Full Name"] || row.Metric, [row.Meaning, row["Why It Matters"], row["What To Do"] && `What to do: ${row["What To Do"]}`].filter(Boolean).join(" "));
      });
    }

    if (diagnosticRows.length) {
      ensureSpace(32);
      addText("Lighthouse Diagnostics", margin, y, 10, "F2", [0.16, 0.21, 0.29]);
      y -= 14;
      diagnosticRows.forEach((row) => {
        drawParagraph(row.Diagnostic, [row.Value, row.Detail].filter(Boolean).join(" - "));
      });
    }
  }

  const securityCategoryAdvance = 18;
  const securityCheckAdvance = 14;
  const securityFieldLabelAdvance = 12;
  const securityLineAdvance = 12.5;

  function drawSecurityRowHeading(row, category, { includeCategory, continued }) {
    if (includeCategory) {
      addText(category, margin, y, 10, "F2", PDF_TONES.ink);
      y -= securityCategoryAdvance;
    }

    const check = textValue(row.Check) || "Security check";
    addText(`${check}${continued ? " (continued)" : ""}`, margin, y, 9.5, "F2", PDF_TONES.ink);
    addText(row.Status || "Unknown", margin + contentWidth - 92, y, 8.5, "F2", toneForStatus(row.Status));
    y -= securityCheckAdvance;
  }

  function drawSecurityContinuation(row, category, fieldLabel, fieldContinued) {
    addPage();
    drawSecurityRowHeading(row, category, { includeCategory: true, continued: true });
    addText(`${fieldLabel}${fieldContinued ? " (continued)" : ""}`, margin, y, 9, "F2", [0.16, 0.21, 0.29]);
    y -= securityFieldLabelAdvance;
  }

  function drawSecurityField(row, category, fieldLabel, value, { startReserved = false } = {}) {
    const body = textValue(value);
    if (!body) {
      return;
    }

    const lines = wrapHelveticaText(body, contentWidth, 8.5);
    let labelDrawn = false;

    if (!startReserved && y - securityFieldLabelAdvance - securityLineAdvance < bottomMargin) {
      drawSecurityContinuation(row, category, fieldLabel, false);
      labelDrawn = true;
    }

    if (!labelDrawn) {
      addText(fieldLabel, margin, y, 9, "F2", [0.16, 0.21, 0.29]);
      y -= securityFieldLabelAdvance;
    }

    lines.forEach((line) => {
      if (y - securityLineAdvance < bottomMargin) {
        drawSecurityContinuation(row, category, fieldLabel, true);
      }
      addText(line, margin, y, 8.5, "F1", [0.18, 0.23, 0.31]);
      y -= securityLineAdvance;
    });

    y = Math.max(bottomMargin, y - 8);
  }

  function drawSecuritySection(rows) {
    if (rows.length === 1 && rows[0].Note) {
      drawParagraph("Security", rows[0].Note);
      return;
    }

    let currentCategory = "";

    rows.forEach((row) => {
      const category = textValue(row.Category) || "Security checks";
      const fields = [
        ["URL", row.URL],
        ["Why it matters", row["Why it matters"]],
        ["Evidence", row.Evidence],
        ["What to do", row.Recommendation],
        ["Guidance / reference", row.Reference],
      ].filter(([, value]) => textValue(value));
      const categoryChanged = category !== currentCategory;
      const firstFieldHeight = fields.length ? securityFieldLabelAdvance + securityLineAdvance : 0;
      let includeCategory = categoryChanged;
      const requiredHeight = securityCheckAdvance + firstFieldHeight + (includeCategory ? securityCategoryAdvance : 0);

      if (y - requiredHeight < bottomMargin) {
        addPage();
        includeCategory = true;
      }

      drawSecurityRowHeading(row, category, { includeCategory, continued: false });
      fields.forEach(([label, value], index) => {
        drawSecurityField(row, category, label, value, { startReserved: index === 0 });
      });

      currentCategory = category;
      y = Math.max(bottomMargin, y - 12);
    });
  }

  function drawTicketSection(rows) {
    if (rows.length === 1 && rows[0].Note) {
      drawParagraph("Tickets", rows[0].Note);
      return;
    }

    rows.forEach((ticket) => {
      ensureSpace(92);
      addText(`${ticket.Ticket || "Ticket"}: ${ticket.Title || "SEO improvement"}`, margin, y, 10, "F2", [0.08, 0.13, 0.2]);
      y -= 13;
      drawKeyValue("Priority", ticket.Priority || "");
      drawKeyValue("Source", ticket.Source || "");
      drawKeyValue("Root Cause", ticket["Root Cause"] || "");
      drawKeyValue("SEO Impact", [ticket["SEO Impact"], ticket["Impact Score"] && `${ticket["Impact Score"]}/5`].filter(Boolean).join(" "));
      drawKeyValue("Effort", [ticket["Implementation Effort"], ticket["Effort Score"] && `${ticket["Effort Score"]}/5`].filter(Boolean).join(" "));
      drawKeyValue("Confidence", ticket.Confidence || "");
      drawParagraph("Priority Rationale", ticket["Priority Rationale"]);
      const relatedFindings = splitListItems(ticket["Related Findings"]);
      if (relatedFindings.length) {
        ensureSpace(28);
        addText("Related Findings", margin, y, 9, "F2", [0.16, 0.21, 0.29]);
        y -= 14;
        drawBullets(relatedFindings);
      }
      if (ticket.URL) {
        drawKeyValue("URL", ticket.URL);
      }
      drawParagraph("User Story", ticket["User Story"]);
      drawParagraph("Technical Details", ticket["Technical Details"]);
      const affectedElements = splitListItems(ticket["Affected Elements"]);
      if (affectedElements.length) {
        ensureSpace(28);
        addText("Affected Elements", margin, y, 9, "F2", [0.16, 0.21, 0.29]);
        y -= 14;
        drawBullets(affectedElements);
      }
      const markupReferences = splitListItems(ticket["Markup References"]);
      if (markupReferences.length) {
        ensureSpace(28);
        addText("Markup References", margin, y, 9, "F2", [0.16, 0.21, 0.29]);
        y -= 14;
        drawBullets(markupReferences);
      }
      drawParagraph("Developer Clue", ticket["Developer Clue"]);
      const criteria = splitListItems(ticket["Acceptance Criteria"]);
      if (criteria.length) {
        ensureSpace(28);
        addText("Acceptance Criteria", margin, y, 9, "F2", [0.16, 0.21, 0.29]);
        y -= 14;
        drawBullets(criteria);
      }
      y -= 8;
    });
  }

  function drawSection(section) {
    const rows = sectionRows(section);
    drawSectionTitle(section.title);

    if (section.title === "Overview") {
      drawOverviewSection(rows);
      return;
    }

    if (section.title === "Content Strategy") {
      drawContentStrategySection(rows);
      return;
    }

    if (section.title === "Core Web Vitals") {
      drawCoreWebVitalsSection(rows);
      return;
    }

    if (section.title === "Security") {
      drawSecuritySection(rows);
      return;
    }

    if (section.title === "Tickets") {
      drawTicketSection(rows);
      return;
    }

    const tableSections = new Set(["Technical SEO", "Action Plan", "Keywords", "What's OK", "What's Not OK", "Do Next", "Metrics", "Your Wins", "Competitor Wins"]);
    if (tableSections.has(section.title) && !(rows.length === 1 && rows[0].Note)) {
      drawTableRows(rows);
      return;
    }

    drawNarrativeRows(rows);
    y -= 12;
  }

  const modeName = MODE_LABELS[mode] || "Report";
  const meta = result.meta || {};
  addText(`PageSignal - ${modeName} Report`, margin, y, 18, "F2", [0.04, 0.09, 0.15]);
  y -= 22;
  [
    ["Primary URL", meta.url || meta.urls?.[0]?.url || ""],
    ["Generated", meta.fetchedAt || new Date().toISOString()],
    ["Source", `${meta.source || ""}${meta.model ? ` / Model: ${meta.model}` : ""}`],
  ].forEach(([label, value]) => {
    addText(`${label}: ${value}`, margin, y, 9, "F1", [0.32, 0.38, 0.48]);
    y -= 12;
  });
  y -= 8;

  reportSections(mode, result).forEach(drawSection);

  if (currentPage.commands.length) {
    pages.push(currentPage);
  }

  const objects = [];
  const pageObjectIds = pages.map((_, index) => 5 + index * 2);
  const contentObjectIds = pages.map((_, index) => 6 + index * 2);

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  pages.forEach((page, index) => {
    const content = page.commands.join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectIds[index]} 0 R >>`
    );
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}
