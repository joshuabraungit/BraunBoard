// When running in GitHub Actions, surface messages as annotations so they show
// on the run summary page (and are readable via the checks API).
const inActions = !!process.env.GITHUB_ACTIONS;
const clean = (s: string) => s.replace(/\r?\n/g, " ").slice(0, 900);

export function notice(msg: string) {
  console.log(inActions ? `::notice::${clean(msg)}` : msg);
}
export function warn(msg: string) {
  console.log(inActions ? `::warning::${clean(msg)}` : msg);
}
export function fail(err: unknown): never {
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  console.error(inActions ? `::error::${clean(msg)}` : msg);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
}

/** Fail fast with a clear message if required secrets are missing. */
export function requireEnv(...names: string[]) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) fail(new Error(`Missing secrets: ${missing.join(", ")}. Add them under Settings > Secrets and variables > Actions.`));
}
