// Next.js calls onRequestError for any error thrown while serving a request: pages, API routes,
// server actions and middleware. We email Josh the details (see lib/error-alert.ts); the visitor
// only sees the plain error page in app/error.tsx.
import type { Instrumentation } from "next";
import { reportError } from "@/lib/error-alert";

export function register() {}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const digest = (err as { digest?: string } | null)?.digest;
  // notFound() and redirect() work by throwing; they aren't real errors.
  if (typeof digest === "string" && /^NEXT_(NOT_FOUND|REDIRECT|HTTP_ERROR_FALLBACK)/.test(digest)) return;
  // A POST carrying a server action ID from an old build. Real visitors' tabs already reload
  // themselves (DeployCheck, app/error.tsx); the repeats here were a bot replaying a stale POST
  // to one job page from Frankfurt, so note it in the Vercel logs instead of the error table.
  const msg = (err as { message?: string } | null)?.message ?? "";
  if ((err as { name?: string } | null)?.name === "UnrecognizedActionError" || /Failed to find Server Action/.test(msg)) {
    console.warn("[stale-server-action]", request.method, request.path.split("?")[0]);
    return;
  }
  const h = request.headers as Record<string, string | string[] | undefined>;
  await reportError(err, {
    where: `${context.routeType} ${context.routePath}`,
    method: request.method,
    path: request.path,
    requestId: String(h["x-vercel-id"] ?? ""),
    digest,
  });
};
