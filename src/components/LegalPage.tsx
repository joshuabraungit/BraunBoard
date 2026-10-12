export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl py-6 text-[15px] leading-relaxed text-ink-2 [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:space-y-1">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="text-sm text-ink-3">Last updated {updated}</p>
      {children}
    </article>
  );
}
