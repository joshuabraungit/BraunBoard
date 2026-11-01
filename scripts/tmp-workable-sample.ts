import { streamWorkableFeed } from "../src/lib/ingest/adapters/workable";
let n = 0;
const shapes = new Map<string, number>();
let noSite = 0;
streamWorkableFeed((j) => {
  n++;
  const shape = j.url.replace(/^https?:\/\//, "").replace(/\/[A-Z0-9]{6,}\/?.*$/i, "/{code}").replace(/^([^/]+)\/[^/]+\/j\//, "$1/{acct}/j/");
  shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
  if (!j.website) noSite++;
  if (n <= 6 || n % 40000 === 0) console.log(JSON.stringify({ url: j.url, company: j.company, website: j.website, ref: j.referencenumber, date: j.date, country: j.country, remote: j.remote }));
  return false;
}).then(({ total }) => {
  console.log("total", total, "no website", noSite);
  console.log(JSON.stringify([...shapes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)));
});
