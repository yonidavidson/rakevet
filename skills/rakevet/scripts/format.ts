// Human-friendly rendering of journeys for the terminal.

import type { Travel } from "./api.ts";
import type { StationInfo } from "./stations.ts";

export type Lang = "en" | "he";

// Most terminals (Ghostty, the one cmux embeds) don't implement the Unicode
// bidi algorithm — they print code points left-to-right in logical order, so
// Hebrew comes out mirrored. We render RTL runs in *visual* order instead:
// reverse the Hebrew text, but keep embedded digits/Latin readable (so platform
// and train numbers don't flip).
const HEBREW = /[֐-׿]/;
export const rtl = (s: string): string => {
  if (!HEBREW.test(s)) return s;
  return [...s].reverse().join("").replace(/[0-9A-Za-z]+/g, (m) => [...m].reverse().join(""));
};

const hhmm = (iso: string) => iso.slice(11, 16);

function durationMin(depIso: string, arrIso: string): number {
  return Math.round((Date.parse(arrIso) - Date.parse(depIso)) / 60000);
}

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m.toString().padStart(2, "0")}` : `${m}m`;
}

// predictedPctLoad is a small bucket (roughly 1..10). Map to a load hint.
function loadHint(pct: number): string {
  if (pct <= 0) return "";
  if (pct <= 3) return "·";   // light
  if (pct <= 6) return "••";  // moderate
  return "•••";               // busy
}

export function formatTravels(
  travels: Travel[],
  names: Map<number, StationInfo>,
  opts: { showLoad: boolean; limit?: number; lang?: Lang } = { showLoad: true },
): string {
  if (travels.length === 0) return "No trains found for that route/time.";
  const lang = opts.lang ?? "en";
  const nameOf = (id: number) => rtl(names.get(id)?.[lang] ?? `#${id}`);
  const shown = opts.limit ? travels.slice(0, opts.limit) : travels;
  const platform = lang === "he" ? rtl("רציף") : "pl.";
  const trainWord = lang === "he" ? rtl("רכבת") : "train";

  const lines: string[] = [];
  for (const t of shown) {
    const dep = hhmm(t.departureTime);
    const arr = hhmm(t.arrivalTime);
    const dur = fmtDuration(durationMin(t.departureTime, t.arrivalTime));
    const changes = t.trains.length - 1;
    const changeLabel =
      changes === 0 ? "direct" : `${changes} change${changes > 1 ? "s" : ""}`;
    lines.push(`${dep} → ${arr}  (${dur}, ${changeLabel})`);

    for (const leg of t.trains) {
      const from = nameOf(leg.orignStation);
      const to = nameOf(leg.destinationStation);
      const load =
        opts.showLoad && leg.predictedPctLoad
          ? `  load ${loadHint(leg.predictedPctLoad)}`
          : "";
      lines.push(
        `    ${hhmm(leg.departureTime)} ${from} (${platform} ${leg.originPlatform})` +
          ` → ${hhmm(leg.arrivalTime)} ${to} (${platform} ${leg.destPlatform})` +
          `   ${trainWord} ${leg.trainNumber}${load}`,
      );
    }
    for (const m of t.travelMessages ?? []) {
      lines.push(`    ⚠ ${rtl([m.title, m.message].filter(Boolean).join(" ").trim())}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
