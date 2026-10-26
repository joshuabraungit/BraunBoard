// The preview card people see when a Braun Board link is pasted into LinkedIn, Slack or a text.

const INK = "#16140f";
const INK2 = "#5b574e";
const BG = "#faf8f4";
const GREEN = "#1f5c3a";

export const OG_SIZE = { width: 1200, height: 630 };

/** The owl's head from the site's owl drawing, as an image the card renderer can use. */
const OWL = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="70 55 260 295"><path d="M110 120 L100 62 L156 96 Z" fill="${INK}"/><path d="M290 120 L300 62 L244 96 Z" fill="${INK}"/><ellipse cx="200" cy="215" rx="125" ry="128" fill="${INK}"/><circle cx="158" cy="172" r="44" fill="${BG}"/><circle cx="242" cy="172" r="44" fill="${BG}"/><circle cx="160" cy="188" r="17" fill="${INK}"/><circle cx="244" cy="188" r="17" fill="${INK}"/><circle cx="165" cy="183" r="4" fill="#fff"/><circle cx="249" cy="183" r="4" fill="#fff"/><circle cx="158" cy="174" r="30" fill="none" stroke="#4cae73" stroke-width="6"/><circle cx="242" cy="174" r="30" fill="none" stroke="#4cae73" stroke-width="6"/><path d="M188 172 L212 172" stroke="#4cae73" stroke-width="6" stroke-linecap="round"/><path d="M186 210 L214 210 L200 236 Z" fill="#c98a1a"/></svg>`,
)}`;

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export function OgCard({ kicker, title, line, sub }: { kicker?: string; title: string; line?: string; sub?: string }) {
  const t = clip(title, 90);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG, padding: "64px 72px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={OWL} width={62} height={70} alt="" />
        <div style={{ fontSize: 34, fontWeight: 700, color: INK }}>Braun Board</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
        {kicker && <div style={{ fontSize: 34, color: INK2, marginBottom: 14 }}>{clip(kicker, 50)}</div>}
        <div style={{ fontSize: t.length > 55 ? 60 : 72, fontWeight: 700, color: INK, lineHeight: 1.1 }}>{t}</div>
        {line && <div style={{ fontSize: 44, fontWeight: 700, color: GREEN, marginTop: 26 }}>{clip(line, 60)}</div>}
        {sub && <div style={{ fontSize: 30, color: INK2, marginTop: 14 }}>{clip(sub, 80)}</div>}
      </div>
      <div style={{ display: "flex", fontSize: 26, color: INK2, borderTop: "2px solid #d9d3c7", paddingTop: 22 }}>
        braunboard.com · B2B sales jobs, with the pay and what the posting leaves out
      </div>
    </div>
  );
}
