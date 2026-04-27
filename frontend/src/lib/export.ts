import type { CalculationResponse } from "../types";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

const SIMPLE_COMMANDS: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  theta: "θ",
  lambda: "λ",
  phi: "φ",
  varphi: "φ",
  omega: "ω",
  Delta: "Δ",
  Omega: "Ω",
  pi: "π",
  cdot: "·",
  times: "×",
  pm: "±",
  to: "→",
  Longrightarrow: "⇒",
  geq: "≥",
  leq: "≤",
  neq: "≠",
  infty: "∞",
  int: "∫",
  sum: "∑",
  prod: "∏",
  sin: "sin",
  cos: "cos",
  tan: "tan",
  cot: "cot",
  sec: "sec",
  csc: "csc",
  asin: "asin",
  acos: "acos",
  atan: "atan",
  arcsin: "arcsin",
  arccos: "arccos",
  arctan: "arctan",
  sinh: "sinh",
  cosh: "cosh",
  tanh: "tanh",
  ln: "ln",
  log: "log",
  exp: "exp",
  det: "det",
  quad: " ",
  qquad: " ",
};

const SINGLE_CHAR_COMMANDS: Record<string, string> = {
  ",": " ",
  ";": " ",
  "!": "",
  "%": "%",
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  n: "ⁿ",
  i: "ⁱ",
};

const SUBSCRIPT_MAP: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
};

function readGrouped(source: string, start: number, open: string, close: string) {
  if (source[start] !== open) {
    return null;
  }

  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === open) {
      depth += 1;
    } else if (source[index] === close) {
      depth -= 1;
      if (depth === 0) {
        return {
          content: source.slice(start + 1, index),
          end: index + 1,
        };
      }
    }
  }

  return null;
}

function convertScript(content: string, type: "super" | "sub") {
  const trimmed = content.trim();
  const map = type === "super" ? SUPERSCRIPT_MAP : SUBSCRIPT_MAP;

  if (trimmed && [...trimmed].every((character) => character in map)) {
    return [...trimmed].map((character) => map[character]).join("");
  }

  return type === "super" ? `^(${trimmed})` : `_(${trimmed})`;
}

function normalizeSpacing(text: string) {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/([A-Za-zα-ωΑ-Ω]+)\s+\(/g, "$1(")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function convertLatexToReadable(source: string): string {
  let output = "";

  for (let index = 0; index < source.length; ) {
    if (source.startsWith("\\begin{aligned}", index)) {
      index += "\\begin{aligned}".length;
      continue;
    }
    if (source.startsWith("\\end{aligned}", index)) {
      index += "\\end{aligned}".length;
      continue;
    }
    if (source.startsWith("\\\\", index)) {
      output += "\n";
      index += 2;
      continue;
    }
    if (source.startsWith("\\,", index) || source.startsWith("\\;", index) || source.startsWith("\\!", index)) {
      output += SINGLE_CHAR_COMMANDS[source[index + 1]] ?? "";
      index += 2;
      continue;
    }
    if (source[index] === "^" || source[index] === "_") {
      const grouped = readGrouped(source, index + 1, "{", "}");
      if (grouped) {
        output += convertScript(grouped.content, source[index] === "^" ? "super" : "sub");
        index = grouped.end;
        continue;
      }
    }
    if (source[index] !== "\\") {
      output += source[index];
      index += 1;
      continue;
    }

    const commandMatch = source.slice(index + 1).match(/^[A-Za-z]+/);
    if (!commandMatch) {
      output += SINGLE_CHAR_COMMANDS[source[index + 1]] ?? source[index + 1] ?? "";
      index += 2;
      continue;
    }

    const command = commandMatch[0];
    const commandEnd = index + 1 + command.length;

    if (command === "frac") {
      const numerator = readGrouped(source, commandEnd, "{", "}");
      const denominator = numerator ? readGrouped(source, numerator.end, "{", "}") : null;
      if (numerator && denominator) {
        output += `(${convertLatexToReadable(numerator.content)})/(${convertLatexToReadable(denominator.content)})`;
        index = denominator.end;
        continue;
      }
    }

    if (command === "sqrt") {
      const degree = source[commandEnd] === "[" ? readGrouped(source, commandEnd, "[", "]") : null;
      const body = readGrouped(source, degree ? degree.end : commandEnd, "{", "}");
      if (body) {
        const renderedBody = convertLatexToReadable(body.content);
        if (degree) {
          output += `root(${convertLatexToReadable(degree.content)}, ${renderedBody})`;
          index = body.end;
          continue;
        }
        output += `√(${renderedBody})`;
        index = body.end;
        continue;
      }
    }

    if (command === "binom") {
      const upper = readGrouped(source, commandEnd, "{", "}");
      const lower = upper ? readGrouped(source, upper.end, "{", "}") : null;
      if (upper && lower) {
        output += `C(${convertLatexToReadable(upper.content)}, ${convertLatexToReadable(lower.content)})`;
        index = lower.end;
        continue;
      }
    }

    if (["operatorname", "mathrm", "mathbf", "mathit", "text"].includes(command)) {
      const content = readGrouped(source, commandEnd, "{", "}");
      if (content) {
        output += convertLatexToReadable(content.content);
        index = content.end;
        continue;
      }
    }

    if (command === "left" || command === "right") {
      index = commandEnd;
      continue;
    }

    if ((command.startsWith("mathrm") || command.startsWith("mathbf")) && command.length > 6) {
      output += command.slice(6);
      index = commandEnd;
      continue;
    }

    output += SIMPLE_COMMANDS[command] ?? command;
    index = commandEnd;
  }

  return normalizeSpacing(output.replace(/[{}]/g, ""));
}

export function normalizeLatexText(text: string) {
  return convertLatexToReadable(text)
    .replace(/\s*·\s*/g, " · ")
    .replace(/\s*×\s*/g, " × ")
    .replace(/\s*→\s*/g, " → ")
    .replace(/\s*⇒\s*/g, " ⇒ ")
    .replace(/\s*≤\s*/g, " ≤ ")
    .replace(/\s*≥\s*/g, " ≥ ")
    .replace(/\s*≠\s*/g, " ≠ ")
    .replace(/\|\s+/g, "|")
    .replace(/\s+\|/g, "|")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function exportResultAsTxt(result: CalculationResponse) {
  const lines = [
    "Wynik kalkulatora",
    "",
    `Wejście: ${normalizeLatexText(result.inputLatex || result.resultPlain)}`,
    `Wartość: ${normalizeLatexText(result.resultLatex || result.resultPlain)}`,
    `Zapis tekstowy: ${result.resultPlain}`,
  ];

  downloadBlob(
    "wynik-kalkulatora.txt",
    new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }),
  );
}

export async function exportElementAsPdf(target: HTMLElement) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(target, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const pdf = new jsPDF(imgHeight > pageHeight ? "l" : "p", "mm", "a4");
  const currentPageHeight = imgHeight > pageHeight ? pageWidth : pageHeight;
  const image = canvas.toDataURL("image/png");

  let offset = 0;
  let remaining = imgHeight;

  while (remaining > 0) {
    pdf.addImage(image, "PNG", margin, margin - offset, imgWidth, imgHeight, undefined, "FAST");
    remaining -= currentPageHeight - margin * 2;
    offset += currentPageHeight - margin * 2;
    if (remaining > 0) {
      pdf.addPage();
    }
  }

  pdf.save("wynik-kalkulatora.pdf");
}
