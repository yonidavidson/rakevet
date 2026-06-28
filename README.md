# rail-cli

A small, zero-dependency CLI for browsing **Israel Railways** ([rail.co.il](https://www.rail.co.il/?lan=he)) from your terminal — search routes, see the next departures, look up stations, and view platforms and crowding.

It talks directly to the same backend the website uses (`rail-api.rail.co.il`), so there's no scraping and no browser involved.

## Requirements

- **Node.js ≥ 22.6** (the CLI is TypeScript run natively — no build step, no `npm install`).

## Install

```bash
git clone https://github.com/yonidavidson/rail-cli.git
cd rail-cli
# optional: make `rail` available everywhere
npm link
```

Or just run it in place with `node src/cli.ts …`.

## Usage

```bash
rail search <from> <to> [--date YYYY-MM-DD] [--time HH:MM] [-n N] [--json]
rail next   <from> <to> [-n N] [--json]
rail stations [query] [--json]
rail refresh
```

`<from>` and `<to>` accept a **station id** or a **name in English or Hebrew**.

### Examples

```bash
# Next trains from now
rail next "tel aviv savidor" "jerusalem navon"

# A specific date and time
rail search 3700 680 --date 2026-07-01 --time 08:30 -n 5

# Find a station's id (English or Hebrew)
rail stations jerusalem
rail stations "באר שבע"

# Machine-readable output
rail next nahariya "beer sheva center" --json
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

The station list is cached under `~/.rail-cli/stations.json` for 30 days.

## Notes

This is an unofficial tool and is not affiliated with or endorsed by Israel Railways. It relies on an undocumented public API and may break if that API changes. Use responsibly.

## License

MIT
