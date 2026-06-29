// Render journeys as a Mermaid flowchart, for hosts that draw diagrams
// (Cursor, the Claude desktop/web apps). Each station is a node; each train
// leg is a labelled edge, so several upcoming departures overlay as parallel
// arrows and trains with changes pass through intermediate station nodes.
//
// Unlike the ASCII renderer we do NOT reverse Hebrew here: Mermaid is drawn in
// a browser, which applies the Unicode bidi algorithm and lays RTL out itself.

import type { Travel } from "./api.ts";
import type { StationInfo } from "./stations.ts";
import type { Lang } from "./format.ts";

const hhmm = (iso: string) => iso.slice(11, 16);

// predictedPctLoad is a small bucket (~1..10). Map to filled dots.
function loadDots(pct: number): string {
  if (pct <= 0) return "";
  if (pct <= 3) return "●";
  if (pct <= 6) return "●●";
  return "●●●";
}

// Escape for a Mermaid double-quoted label. `#` and `"` need HTML entities,
// otherwise Mermaid treats them as markup/quote delimiters.
const esc = (s: string) => s.replace(/"/g, "&quot;").replace(/#/g, "&#35;");

export function renderMermaid(
  travels: Travel[],
  names: Map<number, StationInfo>,
  opts: { limit?: number; lang?: Lang; title?: string } = {},
): string {
  const lang = opts.lang ?? "en";
  const shown = opts.limit ? travels.slice(0, opts.limit) : travels;
  if (shown.length === 0) return "%% No trains found for that route/time.";

  const nameOf = (id: number) => names.get(id)?.[lang] ?? `#${id}`;
  const plat = lang === "he" ? "רציף" : "pl";

  const nodes = new Map<number, string>();
  const edges: string[] = [];

  for (const t of shown) {
    for (const leg of t.trains) {
      nodes.set(leg.orignStation, nameOf(leg.orignStation));
      nodes.set(leg.destinationStation, nameOf(leg.destinationStation));
      const load = loadDots(leg.predictedPctLoad);
      const label = [
        `${hhmm(leg.departureTime)}→${hhmm(leg.arrivalTime)}`,
        `#${leg.trainNumber}`,
        `${plat} ${leg.originPlatform}`,
        load,
      ].filter(Boolean).join(" · ");
      edges.push(`  S${leg.orignStation} -->|"${esc(label)}"| S${leg.destinationStation}`);
    }
  }

  const lines: string[] = [];
  if (opts.title) lines.push("---", `title: ${opts.title}`, "---");
  lines.push("flowchart LR");
  for (const [id, label] of nodes) lines.push(`  S${id}["${esc(label)}"]`);
  lines.push(...edges);
  return lines.join("\n");
}
