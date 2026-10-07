export function toneForScore(score) {
  if (score >= 80) return { text: "Healthy", color: "#287554", className: "text-green-700" };
  if (score >= 55) return { text: "Needs focus", color: "#92600c", className: "text-amber-700" };
  return { text: "Critical", color: "#b33143", className: "text-rose-700" };
}

export function priorityClass(value) {
  if (value === "High" || value === "Critical") return "border-rose-400/30 bg-rose-500/10 text-rose-700";
  if (value === "Medium" || value === "Warning") return "border-amber-400/30 bg-amber-500/10 text-amber-700";
  return "border-sky-400/30 bg-sky-500/10 text-sky-700";
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function textValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map(textValue).filter(Boolean).join("; ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, entry]) => `${key}: ${textValue(entry)}`)
      .filter((entry) => !entry.endsWith(": "))
      .join("; ");
  }

  return String(value).replace(/\s+/g, " ").trim();
}

export function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function tableHeaders(rows) {
  const headers = [];
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!headers.includes(key)) {
        headers.push(key);
      }
    });
  });
  return headers;
}

function spreadsheetText(value) {
  const valueText = textValue(value);
  return /^[=+@-]/.test(valueText) ? `'${valueText}` : valueText;
}

function csvCell(value) {
  const text = spreadsheetText(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function rowsToCsv(rows) {
  const safeRows = rows.length ? rows : [{ Note: "No rows available." }];
  const headers = tableHeaders(safeRows);
  return [headers.map(csvCell).join(","), ...safeRows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
}

export function rowsToTable(rows) {
  const safeRows = rows.length ? rows : [{ Note: "No rows available." }];
  const headers = tableHeaders(safeRows);
  return [headers.map(csvCell).join("\t"), ...safeRows.map((row) => headers.map((header) => csvCell(row[header])).join("\t"))].join("\n");
}

export function downloadBlob(filename, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the textarea path for browsers that expose the API but block it.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function slugify(value) {
  return textValue(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "report";
}
