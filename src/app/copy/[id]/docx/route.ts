// Word download of a saved "their words" copy. Only the person who saved it can get it.
import { AlignmentType, BorderStyle, Document, Packer, Paragraph, TextRun } from "docx";
import { getUser } from "@/lib/session";
import { getCopy } from "@/lib/job-tools/words-db";
import { copyFileName, toBlocks, type Block } from "@/lib/job-tools/words-text";

export const dynamic = "force-dynamic";

const FONT = "Calibri";


function para(b: Block): Paragraph {
  if (b.kind === "name")
    return new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 80 }, children: [new TextRun({ text: b.text, bold: true, size: 36, font: FONT })] });
  if (b.kind === "heading")
    return new Paragraph({
      spacing: { before: 240, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 2 } },
      children: [new TextRun({ text: b.text.toUpperCase(), bold: true, size: 20, font: FONT })],
    });
  if (b.kind === "role") return new Paragraph({ spacing: { before: 120, after: 40 }, children: [new TextRun({ text: b.text, bold: true, size: 21, font: FONT })] });
  if (b.kind === "bullet") return new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [new TextRun({ text: b.text, size: 21, font: FONT })] });
  return new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: b.text, size: 21, font: FONT })] });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser().catch(() => null);
  if (!user) return Response.redirect(new URL(`/login?next=/copy/${id}/docx`, req.url));
  const copy = await getCopy(user.id, id);
  if (!copy) return new Response("Not found", { status: 404 });
  const doc = new Document({
    creator: "",
    title: `Résumé for ${copy.company}`,
    sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } }, children: toBlocks(copy.body).map(para) }],
  });
  const buf = await Packer.toBuffer(doc);
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="${copyFileName(copy.company, copy.job_title, "docx")}"`,
      "cache-control": "private, no-store",
    },
  });
}
