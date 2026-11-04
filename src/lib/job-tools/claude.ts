// One place that talks to Claude for the job tools. Same plain fetch the rest of the site uses.
import "server-only";
import { firstJsonObject } from "../ingest/buyer";

export const TOOLS_MODEL = () => process.env.JOB_TOOLS_MODEL ?? "claude-sonnet-5-5";

export interface WebSource {
  url: string;
  title: string;
}

type Block =
  | { type: "text"; text?: string }
  | { type: "web_search_tool_result"; content?: { type: string; url?: string; title?: string }[] | { type: string } }
  | { type: string };

/**
 * Ask Claude for JSON. With `search`, Claude can run web searches first; the pages it
 * actually got back are returned too, so callers can throw out any link it didn't see.
 */
export async function askJson(opts: {
  system: string;
  user: string | unknown[];
  maxTokens?: number;
  search?: { maxUses: number; blockedDomains?: string[] };
  key?: string;
}): Promise<{ json: Record<string, unknown>; sources: WebSource[] }> {
  const key = opts.key ?? process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("No API key");
  const body: Record<string, unknown> = {
    model: TOOLS_MODEL(),
    max_tokens: opts.maxTokens ?? 2500,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  };
  if (opts.search) {
    body.tools = [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: opts.search.maxUses,
        ...(opts.search.blockedDomains?.length ? { blocked_domains: opts.search.blockedDomains } : {}),
      },
    ];
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = (await res.json()) as { content: Block[]; stop_reason?: string };
  const sources: WebSource[] = [];
  for (const b of data.content) {
    if (b.type === "web_search_tool_result" && "content" in b && Array.isArray(b.content)) {
      for (const r of b.content) if (r.type === "web_search_result" && r.url) sources.push({ url: r.url, title: r.title ?? r.url });
    }
  }
  // With search on, the JSON is in the last text block (earlier ones are thinking out loud between searches).
  const texts = data.content.filter((c): c is { type: "text"; text?: string } => c.type === "text").map((c) => c.text ?? "");
  const text = texts.reverse().find((t) => t.includes("{")) ?? "";
  if (!text) throw new Error(`No JSON in reply (stop=${data.stop_reason}, blocks=${data.content.map((c) => c.type).join(",")})`);
  return { json: (firstJsonObject(text) ?? {}) as Record<string, unknown>, sources };
}

export const str = (v: unknown, max = 400) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : "");
export const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
