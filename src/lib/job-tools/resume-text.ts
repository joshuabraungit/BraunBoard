// Pull the words out of a résumé PDF or Word file, on our server, without AI.
import "server-only";
import { extractText, getDocumentProxy } from "unpdf";

export async function pdfText(bytes: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  return (Array.isArray(text) ? text.join("\n") : text).replace(/[ \t]+\n/g, "\n").trim();
}

/** Word (.docx): one line per paragraph, so bullets and headings stay on their own lines. */
export async function docxText(bytes: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: bytes });
  return value.replace(/\r/g, "").replace(/\n{2,}/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
}
