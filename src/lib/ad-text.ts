// A tiny bit of formatting for sponsored job ads, typed in a plain textarea in Admin:
//   ## Heading            (or a line that's only **bold**)
//   - bullet
//   1. numbered item
//   **bold** inside a line
// Everything else is a paragraph. Blank lines split paragraphs; single line breaks stay.

export type AdBlock =
  | { type: "h"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

export type Inline = { text: string; bold: boolean };

const HEADING = /^#{1,3}\s+(.+)$/;
const BOLD_LINE = /^\*\*([^*]+)\*\*$/;
const BULLET = /^[-*•]\s+(.+)$/;
const NUMBERED = /^\d+[.)]\s+(.+)$/;

export function parseAdText(raw: string): AdBlock[] {
  const blocks: AdBlock[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "p", text: para.join("\n") });
    para = [];
  };
  const pushItem = (type: "ul" | "ol", item: string) => {
    flush();
    const last = blocks[blocks.length - 1];
    if (last && last.type === type) last.items.push(item);
    else blocks.push({ type, items: [item] });
  };

  for (const line of raw.replace(/\r\n?/g, "\n").split("\n")) {
    const t = line.trim();
    if (!t) {
      flush();
      continue;
    }
    const h = t.match(HEADING) ?? t.match(BOLD_LINE);
    if (h) {
      flush();
      blocks.push({ type: "h", text: h[1].trim() });
      continue;
    }
    const b = t.match(BULLET);
    if (b) {
      pushItem("ul", b[1]);
      continue;
    }
    const n = t.match(NUMBERED);
    if (n) {
      pushItem("ol", n[1]);
      continue;
    }
    para.push(t);
  }
  flush();
  return blocks;
}

/** Splits "**8:52:** Coffee." into bold and plain runs. An unclosed ** stays as typed. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let at = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > at) out.push({ text: text.slice(at, m.index), bold: false });
    out.push({ text: m[1], bold: true });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at), bold: false });
  return out;
}

/** The ad as one plain run of text, for the 3-line preview on the home page card. Headings are skipped. */
export function adPlainText(raw: string): string {
  return parseAdText(raw)
    .flatMap((b) => (b.type === "h" ? [] : b.type === "p" ? [b.text] : b.items))
    .map((s) => parseInline(s).map((r) => r.text).join(""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
