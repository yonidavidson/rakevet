---
name: rakevet
description: >-
  Browse Israel Railways (rail.co.il) — next train departures, routes and
  schedules between two stations, platforms, crowding, and station lookup.
  Use whenever the user asks about Israeli trains / רכבת ישראל: "when's the next
  train from Tel Aviv to Haifa", "trains to Jerusalem at 9am", "which platform",
  "how packed is it", or to find a station's name/id. Renders the journey as a
  Mermaid diagram in hosts that draw diagrams (Cursor, the Claude desktop/web
  apps) and as an ASCII table in Claude Code or a plain terminal.
---

# rakevet — Israel Railways

A small, zero-dependency engine that queries the (unofficial) public API behind
rail.co.il and prints train journeys. This skill **drives that engine**: you run
the bundled script to get the data, then present it in the format that fits the
current host.

## 1. Locate & run the engine

The engine is a single TypeScript file run natively by Node (**requires Node
≥ 22.6** — no build, no `npm install`). It lives in this skill's own directory:

```
<skill-dir>/scripts/rakevet.ts
```

Pick how to invoke it, in this order:

1. If a `rakevet` command is on `PATH`, just use `rakevet …`.
2. As a Claude Code plugin, the script is at
   `${CLAUDE_PLUGIN_ROOT}/skills/rakevet/scripts/rakevet.ts`.
3. Otherwise use the absolute path to `scripts/rakevet.ts` inside this skill
   directory.

Invoke with Node, e.g.:

```bash
node --no-warnings "<skill-dir>/scripts/rakevet.ts" next "tel aviv savidor" "haifa hof hacarmel" --render mermaid
```

## 2. Commands

```
rakevet next   <from> <to> [-n N]                 # next departures from now (default 5)
rakevet search <from> <to> [--date YYYY-MM-DD] [--time HH:MM] [-n N]
rakevet stations [query]                          # find a station's name/id (EN/HE)
rakevet refresh                                   # force-refresh the cached station list
```

- `<from>` / `<to>` accept a **station id** or a **name in English or Hebrew**.
- Add `--lang he` for Hebrew station names and service messages (default follows
  the user's locale).
- Renderer flag: `--render ascii` (default) · `--render mermaid` · `--render json`
  (shorthands `--ascii` / `--mermaid` / `--json`).

## 3. Choose the renderer based on the host

This is the important part — **match the output to what the host can display**:

- **Diagram-capable host** — Cursor, or the Claude desktop / web apps (anything
  that renders Mermaid in chat): call with `--render mermaid` and present the
  result inside a ` ```mermaid ` fenced block. The journey draws as a flowchart:
  one node per station, one labelled arrow per train leg (time · train # ·
  platform · crowding), so several upcoming departures appear as parallel
  arrows and a trip with a change passes through the interchange station.
- **Claude Code or a plain terminal** (no diagram rendering): call with
  `--render ascii` (the default) and present the result inside a plain code
  block. ASCII Hebrew is rendered in visual order so it reads correctly in
  terminals that don't reorder RTL text.
- **Need to compute** (filter, count, pick the cheapest/least-crowded, build your
  own view): call with `--render json` and work from the structured data.

When you can't tell what the host supports, default to **ascii**.

## 4. Resolving stations

If a name is ambiguous (e.g. "haifa" matches several stations) the engine exits
non-zero and prints the candidates with their ids. Show the user those options,
or re-run with a more specific name or the numeric id. Use
`rakevet stations <query>` to look ids up.

## 5. Notes

- Station list is cached for 30 days under `~/.rakevet`; `refresh` re-fetches it.
- Times are local (Asia/Jerusalem), ISO `YYYY-MM-DDThh:mm:ss`. Slice `[11:16]`
  for `HH:MM`.
- Unofficial tool, not affiliated with Israel Railways; it uses the same public
  API the website does and may break if that changes.
