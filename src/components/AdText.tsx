import { parseAdText, parseInline } from "@/lib/ad-text";

function Line({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((r, i) => (r.bold ? <strong key={i} className="font-semibold text-ink">{r.text}</strong> : <span key={i}>{r.text}</span>))}
    </>
  );
}

/** A sponsored job ad with its headings, bullets and bold bits. See lib/ad-text.ts for the rules. */
export function AdText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`text-[15px] leading-relaxed text-ink ${className}`}>
      {parseAdText(text).map((b, i) => {
        if (b.type === "h")
          return (
            <h2 key={i} className="mb-2 mt-7 text-lg font-bold tracking-tight first:mt-0">
              <Line text={b.text} />
            </h2>
          );
        if (b.type === "ul")
          return (
            <ul key={i} className="mb-4 list-disc space-y-1.5 pl-5 marker:text-ink-3">
              {b.items.map((it, j) => (
                <li key={j}>
                  <Line text={it} />
                </li>
              ))}
            </ul>
          );
        if (b.type === "ol")
          return (
            <ol key={i} className="mb-4 list-decimal space-y-1.5 pl-5 marker:text-ink-3">
              {b.items.map((it, j) => (
                <li key={j}>
                  <Line text={it} />
                </li>
              ))}
            </ol>
          );
        return (
          <p key={i} className="mb-4 whitespace-pre-line">
            <Line text={b.text} />
          </p>
        );
      })}
    </div>
  );
}
