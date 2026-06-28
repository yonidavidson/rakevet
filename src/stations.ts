// Station catalog with on-disk caching and name/id resolution.
// Fetches both English and Hebrew names so either can be used to look up a station.

import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { getStations } from "./api.ts";

export interface StationInfo {
  id: number;
  en: string;
  he: string;
  parking: boolean;
  handicap: boolean;
}

const CACHE_DIR = join(homedir(), ".rail-cli");
const CACHE_FILE = join(CACHE_DIR, "stations.json");
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

async function fetchCatalog(): Promise<StationInfo[]> {
  const [en, he] = await Promise.all([
    getStations("English"),
    getStations("Hebrew"),
  ]);
  const heById = new Map(he.map((s) => [s.stationId, s.stationName]));
  return en
    .map((s) => ({
      id: s.stationId,
      en: s.stationName,
      he: heById.get(s.stationId) ?? s.stationName,
      parking: s.parking,
      handicap: s.handicap,
    }))
    .sort((a, b) => a.en.localeCompare(b.en));
}

function cacheIsFresh(): boolean {
  if (!existsSync(CACHE_FILE)) return false;
  return Date.now() - statSync(CACHE_FILE).mtimeMs < CACHE_TTL_MS;
}

export async function loadStations(forceRefresh = false): Promise<StationInfo[]> {
  if (!forceRefresh && cacheIsFresh()) {
    try {
      return JSON.parse(readFileSync(CACHE_FILE, "utf8")) as StationInfo[];
    } catch {
      // fall through to refetch on a corrupt cache
    }
  }
  const catalog = await fetchCatalog();
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(catalog));
  return catalog;
}

// Normalize for matching: drop apostrophes (so "Be'er" → "beer"), turn other
// punctuation into spaces ("Tel Aviv - Savidor" → "tel aviv savidor").
const norm = (s: string) =>
  s.toLowerCase()
    .replace(/['’`׳"״]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Find stations matching a free-text query: every query token must appear in a name. */
export function searchStations(stations: StationInfo[], query: string): StationInfo[] {
  const q = norm(query);
  if (!q) return stations;
  const tokens = q.split(" ");
  const matches = stations.filter((s) => {
    const en = norm(s.en);
    const he = norm(s.he);
    return tokens.every((t) => en.includes(t)) || tokens.every((t) => he.includes(t));
  });
  return matches.sort((a, b) => score(b, q) - score(a, q));
}

function score(s: StationInfo, q: string): number {
  const en = norm(s.en);
  const he = norm(s.he);
  if (en === q || he === q) return 3;
  if (en.startsWith(q) || he.startsWith(q)) return 2;
  return 1;
}

/**
 * Resolve a user-supplied token to a single station id.
 * Accepts a numeric id directly, otherwise an unambiguous name match.
 * Throws with helpful candidates when ambiguous or not found.
 */
export function resolveStation(stations: StationInfo[], token: string): StationInfo {
  if (/^\d+$/.test(token.trim())) {
    const byId = stations.find((s) => s.id === Number(token));
    if (byId) return byId;
    throw new Error(`No station with id ${token}.`);
  }
  const matches = searchStations(stations, token);
  if (matches.length === 0) {
    throw new Error(`No station matching "${token}". Try: rail stations <query>`);
  }
  // A single match, or an exact-name match, wins; otherwise list candidates.
  if (matches.length === 1 || score(matches[0], norm(token)) === 3) return matches[0];
  const list = matches.slice(0, 8).map((s) => `  ${s.id}  ${s.en} / ${s.he}`).join("\n");
  throw new Error(`"${token}" is ambiguous. Did you mean:\n${list}`);
}
