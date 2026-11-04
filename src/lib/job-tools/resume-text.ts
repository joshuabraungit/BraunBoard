// Pull the words out of a résumé PDF, on our server, without AI. Nothing is stored.
import "server-only";
import { extractText, getDocumentProxy } from "unpdf";

export async function pdfText(bytes: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  return (Array.isArray(text) ? text.join("\n") : text).replace(/[ \t]+\n/g, "\n").trim();
}
