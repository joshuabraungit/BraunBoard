// PDF download of a saved "their words" copy. Only the person who saved it can get it.
import { getUser } from "@/lib/session";
import { getCopy } from "@/lib/job-tools/words-db";
import { copyFileName } from "@/lib/job-tools/words-text";
import { resumePdf } from "@/lib/job-tools/resume-pdf";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser().catch(() => null);
  if (!user) return Response.redirect(new URL(`/login?next=/copy/${id}/pdf`, req.url));
  const copy = await getCopy(user.id, id);
  if (!copy) return new Response("Not found", { status: 404 });
  try {
    const pdf = await resumePdf(copy.body, `Résumé for ${copy.company}`);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${copyFileName(copy.company, copy.job_title, "pdf")}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[copy] pdf failed:", e instanceof Error ? e.message : e);
    return new Response("Couldn't build the PDF. Try the Word download.", { status: 500 });
  }
}
