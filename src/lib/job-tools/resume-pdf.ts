// The one clean résumé layout as a real PDF: single column, selectable text, no graphics.
// Built on our server with an embedded font (Inter), so names like "Nguyễn" come out right.
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { toBlocks } from "./words-text";

const PAGE = { w: 612, h: 792 }; // US Letter
const MARGIN = { x: 54, top: 54, bottom: 54 };
const WIDTH = PAGE.w - MARGIN.x * 2;
const BLACK = rgb(0.07, 0.07, 0.07);
const GREY = rgb(0.6, 0.6, 0.6);

let fonts: Promise<[Buffer, Buffer]> | null = null;
const loadFonts = () =>
  (fonts ??= Promise.all([
    readFile(path.join(process.cwd(), "private", "fonts", "Inter_400Regular.ttf")),
    readFile(path.join(process.cwd(), "private", "fonts", "Inter_700Bold.ttf")),
  ]));

/** Drop characters the font can't draw rather than failing the whole download. */
function drawable(font: PDFFont, text: string): string {
  const set = new Set(font.getCharacterSet());
  return [...text].filter((c) => set.has(c.codePointAt(0)!)).join("");
}

function wrap(font: PDFFont, size: number, text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function resumePdf(body: string, title: string): Promise<Uint8Array> {
  const [regBytes, boldBytes] = await loadFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(title);
  doc.setCreator("");
  doc.setProducer("");
  const reg = await doc.embedFont(regBytes, { subset: false });
  const bold = await doc.embedFont(boldBytes, { subset: false });

  let page: PDFPage = doc.addPage([PAGE.w, PAGE.h]);
  let y = PAGE.h - MARGIN.top;
  const need = (h: number) => {
    if (y - h < MARGIN.bottom) {
      page = doc.addPage([PAGE.w, PAGE.h]);
      y = PAGE.h - MARGIN.top;
    }
  };
  const write = (text: string, font: PDFFont, size: number, x: number, width: number, gapAfter: number) => {
    const lh = size * 1.35;
    for (const l of wrap(font, size, drawable(font, text), width)) {
      need(lh);
      y -= lh;
      page.drawText(l, { x, y, size, font, color: BLACK });
    }
    y -= gapAfter;
  };

  for (const b of toBlocks(body)) {
    if (b.kind === "name") write(b.text, bold, 18, MARGIN.x, WIDTH, 4);
    else if (b.kind === "heading") {
      need(30);
      y -= 10;
      write(b.text.toUpperCase(), bold, 9.5, MARGIN.x, WIDTH, 0);
      y -= 3;
      page.drawLine({ start: { x: MARGIN.x, y }, end: { x: PAGE.w - MARGIN.x, y }, thickness: 0.6, color: GREY });
      y -= 4;
    } else if (b.kind === "role") {
      need(30);
      y -= 5;
      write(b.text, bold, 10.5, MARGIN.x, WIDTH, 1.5);
    } else if (b.kind === "bullet") {
      need(14);
      page.drawText("•", { x: MARGIN.x + 2, y: y - 10.5 * 1.35, size: 10.5, font: reg, color: BLACK });
      write(b.text, reg, 10.5, MARGIN.x + 14, WIDTH - 14, 1.5);
    } else write(b.text, reg, 10.5, MARGIN.x, WIDTH, 1.5);
  }
  return doc.save();
}
