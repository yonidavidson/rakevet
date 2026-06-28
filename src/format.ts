// Human-friendly rendering of journeys for the terminal.

import type { Travel } from "./api.ts";
import type { StationInfo } from "./stations.ts";

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
  opts: { showLoad: boolean; limit?: number } = { showLoad: true },
): string {
  if (travels.length === 0) return "No trains found for that route/time.";
  const nameOf = (id: number) => names.get(id)?.en ?? `#${id}`;
  const shown = opts.limit ? travels.slice(0, opts.limit) : travels;

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
        `    ${hhmm(leg.departureTime)} ${from} (pl. ${leg.originPlatform})` +
          ` → ${hhmm(leg.arrivalTime)} ${to} (pl. ${leg.destPlatform})` +
          `   train ${leg.trainNumber}${load}`,
      );
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
