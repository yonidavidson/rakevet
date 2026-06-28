# rakevet 🚆

> *rakevet* (רכבת) — Hebrew for "train".

A small, zero-dependency CLI for browsing **Israel Railways** ([rail.co.il](https://www.rail.co.il/?lan=he)) from your terminal — search routes, see the next departures, look up stations, and view platforms and crowding.

It talks directly to the same backend the website uses (`rail-api.rail.co.il`), so there's no scraping and no browser involved.

🌐 **Docs site:** https://yonidavidson.github.io/rakevet/

## Requirements

- **Node.js ≥ 22.6** (the CLI is TypeScript run natively — no build step, no `npm install`).

## Install

```bash
git clone https://github.com/yonidavidson/rakevet.git
cd rakevet
npm link            # exposes the `rakevet` command
```

Or run it in place without linking: `node src/cli.ts …`.

### Using nvm? (make `rakevet` work in every terminal tab)

`npm link` installs `rakevet` into the **currently active** Node version's `bin`,
so it disappears in tabs where a different nvm version is selected. For a launcher
that works in any tab regardless of the active Node, drop a small wrapper on your
`PATH` instead:

```bash
mkdir -p ~/.local/bin
cat > ~/.local/bin/rakevet <<'EOF'
#!/bin/sh
# rakevet launcher — independent of the active nvm version.
CLI="$HOME/dev/private/rakevet/src/cli.ts"   # adjust to your clone path
N="$(command -v node 2>/dev/null)"
[ -x "$N" ] && exec "$N" --no-warnings "$CLI" "$@"
echo "rakevet: could not find a Node.js runtime (need >=22.6)" >&2; exit 1
EOF
chmod +x ~/.local/bin/rakevet
```

Make sure `~/.local/bin` is on your `PATH`. Pin a TS-capable default with
`nvm alias default 22` (or newer) so the wrapper always finds a Node ≥ 22.6.

## Usage

```bash
rakevet search <from> <to> [--date YYYY-MM-DD] [--time HH:MM] [-n N] [--lang en|he] [--json]
rakevet next   <from> <to> [-n N] [--lang en|he] [--json]
rakevet stations [query] [--json]
rakevet refresh
```

Add `--lang he` to print station names, platforms and service messages in Hebrew.

`<from>` and `<to>` accept a **station id** or a **name in English or Hebrew**.

### Examples

```bash
# Next trains from now
rakevet next "tel aviv savidor" "jerusalem navon"

# A specific date and time
rakevet search 3700 680 --date 2026-07-01 --time 08:30 -n 5

# Find a station's id (English or Hebrew)
rakevet stations jerusalem
rakevet stations "באר שבע"

# Machine-readable output
rakevet next nahariya "beer sheva center" --json
```

### Example output

```
Tel Aviv - Savidor Center → Jerusalem - Yitzhak Navon   2026-06-28 (from 13:27)

13:37 → 14:22  (45m, direct)
    13:37 Tel Aviv - Savidor Center (pl. 4) → 14:22 Jerusalem - Yitzhak Navon (pl. 3)   train 745  load •••
```

`load` is a hint from the API's predicted crowding: `·` light, `••` moderate, `•••` busy.

## Commands

| Command | What it does |
| --- | --- |
| `search` | Routes between two stations at a given date/time. |
| `next` | Upcoming departures from now (defaults to 5). |
| `stations` | List or search the station catalog (name ↔ id, EN + HE). |
| `refresh` | Force-refresh the cached station list. |

The station list is cached under `~/.rakevet/stations.json` for 30 days.

## For AI agents

`rakevet` is a clean, scriptable interface to Israel Railways train times — useful
when an agent needs live schedule data. Guidelines:

- **Always pass `--json`** for machine consumption. Output is an array of
  *travels*; each has `departureTime`, `arrivalTime`, `freeSeats`, and a `trains`
  array (one entry per leg) with `orignStation`, `destinationStation`,
  `originPlatform`, `destPlatform`, `departureTime`, `arrivalTime`, `trainNumber`,
  and `predictedPctLoad` (crowding hint). `trains.length > 1` means a change.
- **Resolve stations first** with `rakevet stations <query> --json` to get the
  numeric `id`, then pass ids to `search`/`next` for unambiguous results. Names
  also work (English or Hebrew) but may be ambiguous — the CLI exits non-zero and
  prints candidates when a name matches more than one station.
- **`next`** answers "when is the next train from A to B" (departures from now);
  **`search`** takes `--date YYYY-MM-DD` and `--time HH:MM` for a specific time.
- **Exit codes**: `0` success, `1` on error (unknown/ambiguous station, network, or
  API failure) with a human-readable message on stderr.
- Times are local ISO strings (e.g. `2026-06-28T13:37:00`); slice `[11:16]` for `HH:MM`.

```bash
# Next departure, structured
rakevet next 3700 680 -n 1 --json

# Look up an id before querying
rakevet stations "tel aviv" --json
```

## Notes

This is an unofficial tool and is not affiliated with or endorsed by Israel Railways. It relies on an undocumented public API and may break if that API changes. Use responsibly.

## License

MIT
