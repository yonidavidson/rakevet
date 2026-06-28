#!/usr/bin/env -S node --no-warnings
// rail — a small CLI for browsing Israel Railways (rail.co.il).
//
// Usage:
//   rail search <from> <to> [--date YYYY-MM-DD] [--time HH:MM] [-n N] [--json]
//   rail next   <from> <to> [-n N] [--json]
//   rail stations [query] [--json]
//   rail refresh                 # force-refresh the cached station list
//
// <from>/<to> accept a station id or a name in English or Hebrew.

import { searchTrain } from "./api.ts";
import { loadStations, searchStations, resolveStation, type StationInfo } from "./stations.ts";
import { formatTravels, rtl, type Lang } from "./format.ts";

// Default language from the locale (LC_ALL/LC_MESSAGES/LANG), e.g. "he_IL.UTF-8".
function localeLang(): Lang {
  const loc = process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || "";
  return /^he\b|^he[_-]/i.test(loc) ? "he" : "en";
}

interface Flags {
  positionals: string[];
  date?: string;
  time?: string;
  limit?: number;
  lang: Lang;
  json: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): Flags {
  const f: Flags = { positionals: [], lang: localeLang(), json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--date": f.date = argv[++i]; break;
      case "--time": case "--hour": f.time = argv[++i]; break;
      case "-n": case "--limit": f.limit = Number(argv[++i]); break;
      case "-l": case "--lang": f.lang = /^he|hebrew$/i.test(argv[++i] ?? "") ? "he" : "en"; break;
      case "--json": f.json = true; break;
      case "-h": case "--help": f.help = true; break;
      default: f.positionals.push(a);
    }
  }
  return f;
}

const pad = (n: number) => String(n).padStart(2, "0");
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowHHMM(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const USAGE = `rail — browse Israel Railways (rail.co.il)

Commands:
  search <from> <to> [--date YYYY-MM-DD] [--time HH:MM] [-n N] [--json]
                               Search routes between two stations.
  next   <from> <to> [-n N] [--json]
                               Next departures from now (default 5).

Options:
  --lang en|he   Show station names and service messages in English or Hebrew.
  stations [query] [--json]    List or search stations (name or id, EN/HE).
  refresh                      Force-refresh the cached station list.

<from>/<to> accept a station id or a name in English or Hebrew, e.g.
  rail next "tel aviv savidor" jerusalem
  rail search 3700 680 --date 2026-07-01 --time 08:30`;

function stationMap(stations: StationInfo[]): Map<number, StationInfo> {
  return new Map(stations.map((s) => [s.id, s]));
}

async function cmdSearch(f: Flags, next: boolean): Promise<void> {
  const [fromTok, toTok] = f.positionals;
  if (!fromTok || !toTok) {
    console.error(`Usage: rail ${next ? "next" : "search"} <from> <to> [...]`);
    process.exit(1);
  }
  const stations = await loadStations();
  const from = resolveStation(stations, fromTok);
  const to = resolveStation(stations, toTok);

  const date = next ? today() : f.date ?? today();
  const time = next ? nowHHMM() : f.time ?? nowHHMM();

  let travels = await searchTrain({
    fromStation: from.id,
    toStation: to.id,
    date,
    hour: time,
    language: f.lang === "he" ? "Hebrew" : "English",
  });

  // The API returns a window around the requested time; show departures from it onward.
  travels.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
  const cutoff = `${date}T${time}`;
  travels = travels.filter((t) => t.departureTime.slice(0, 16) >= cutoff);
  const limit = f.limit ?? (next ? 5 : undefined);

  if (f.json) {
    console.log(JSON.stringify(limit ? travels.slice(0, limit) : travels, null, 2));
    return;
  }

  const fromName = rtl(from[f.lang]);
  const toName = rtl(to[f.lang]);
  console.log(`${fromName} → ${toName}   ${date} ${next ? "(from " + time + ")" : time}\n`);
  console.log(formatTravels(travels, stationMap(stations), { showLoad: true, limit, lang: f.lang }));
}

async function cmdStations(f: Flags): Promise<void> {
  const stations = await loadStations();
  const query = f.positionals.join(" ");
  const results = query ? searchStations(stations, query) : stations;
  if (f.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  if (results.length === 0) {
    console.log(`No stations matching "${query}".`);
    return;
  }
  for (const s of results) {
    const tags = [s.parking ? "P" : "", s.handicap ? "♿" : ""].filter(Boolean).join(" ");
    console.log(`${String(s.id).padStart(5)}  ${s.en.padEnd(28)} ${s.he}${tags ? "   " + tags : ""}`);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const f = parseArgs(argv.slice(1));

  if (!cmd || f.help || cmd === "help") {
    console.log(USAGE);
    return;
  }

  switch (cmd) {
    case "search": await cmdSearch(f, false); break;
    case "next":   await cmdSearch(f, true); break;
    case "stations": case "station": await cmdStations(f); break;
    case "refresh":
      await loadStations(true);
      console.log("Station list refreshed.");
      break;
    default:
      console.error(`Unknown command "${cmd}".\n`);
      console.log(USAGE);
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
