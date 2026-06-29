// Thin client for the (unofficial) Israel Railways API used by rail.co.il.
// The subscription key below is the public key bundled into the site's main.js;
// the rail-api.rail.co.il host is not behind the Cloudflare challenge that
// guards www.rail.co.il, so these endpoints are reachable directly.

const API_BASE = "https://rail-api.rail.co.il";
const API_KEY = "5e64d66cf03f4547bcac5de2de06b566";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.0 Safari/605.1.15";

export type Language = "Hebrew" | "English";

export interface Station {
  stationId: number;
  stationName: string;
  parking: boolean;
  handicap: boolean;
  location: { latitude: number; lontitude: number };
  synonyms: string[];
}

export interface RouteStation {
  stationId: number;
  arrivalTime: string; // "HH:MM"
  platform: number;
  predictedPctLoad: number;
}

export interface Train {
  trainNumber: number;
  orignStation: number;
  destinationStation: number;
  originPlatform: number;
  destPlatform: number;
  arrivalTime: string; // ISO local, e.g. "2026-06-29T01:29:00"
  departureTime: string;
  predictedPctLoad: number;
  stopStations: RouteStation[];
  routeStations: RouteStation[];
}

export interface TravelMessage {
  title: string;
  message: string;
}

export interface Travel {
  departureTime: string;
  arrivalTime: string;
  freeSeats: number;
  travelMessages: TravelMessage[] | null;
  trains: Train[];
}

interface ApiEnvelope<T> {
  successStatus: number;
  statusCode: number;
  errorMessages: string[] | null;
  result: T;
}

async function call<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const res = await fetch(API_BASE + path, {
    ...init,
    headers: {
      "User-Agent": USER_AGENT,
      "ocp-apim-subscription-key": API_KEY,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`API ${path} returned HTTP ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as ApiEnvelope<T>;
  if (body.statusCode && body.statusCode !== 200) {
    throw new Error(
      `API ${path} error ${body.statusCode}: ${(body.errorMessages ?? []).join("; ")}`,
    );
  }
  return body.result;
}

export function getStations(language: Language = "English"): Promise<Station[]> {
  return call<Station[]>(
    `/common/api/v1/stations?languageId=${language}&systemType=2`,
    { method: "GET" },
  );
}

export interface SearchParams {
  fromStation: number;
  toStation: number;
  date: string; // YYYY-MM-DD
  hour: string; // HH:MM
  language?: Language;
  scheduleType?: "ByDeparture" | "ByArrival";
}

interface SearchResult {
  numOfResultsToShow: number;
  startFromIndex: number;
  travels: Travel[];
}

export async function searchTrain(p: SearchParams): Promise<Travel[]> {
  const result = await call<SearchResult>(
    "/rjpa/api/v1/timetable/searchTrain",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromStation: String(p.fromStation),
        toStation: String(p.toStation),
        date: p.date,
        hour: p.hour,
        scheduleType: p.scheduleType ?? "ByDeparture",
        systemType: "2",
        languageId: p.language ?? "English",
      }),
    },
  );
  return result.travels ?? [];
}
