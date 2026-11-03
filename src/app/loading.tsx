// Shows right away when someone clicks back to the home page, while the jobs load.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading jobs" className="animate-pulse">
      <div className="mb-10 h-40 rounded-2xl border border-line bg-surface" />
      {[0, 1].map((s) => (
        <div key={s} className="mt-10">
          <div className="mb-4 h-6 w-40 rounded bg-line" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-44 rounded-xl border border-line bg-surface" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
