# Lineup Viewer (placeholder) — Design

## Context

`frontend/src/app/stats/page.tsx` renders a stats dashboard for a match, made up of several panels. Most of these panels (Top Performers, Team Profiles, Event Details) already show static placeholder/mock data — the page isn't wired up to a real "team roster" or "lineup" data source anywhere.

One panel (top-right, `flex flex-col h-100 ...`) currently renders the `MatchList` component: a list backed by the backend's in-memory `/matches` endpoint, plus an "add a match" form. This feature is unrelated to the match-stats purpose of the page and is being replaced.

## Goal

Replace the Match List panel with a placeholder **lineup viewer**: a graphic showing each team's starting XI on a mini soccer pitch, one team visible at a time, navigable via arrow buttons.

## Scope

- Frontend only. No backend changes, no new API calls.
- Mock/static data only, matching the pattern already used by Top Performers and Team Profiles on this page.
- This is explicitly a placeholder — it is not wired to real lineup data from API-Football.

## Changes to `frontend/src/app/stats/page.tsx`

Remove (no longer used on this page):
- `MatchList` component definition
- `matches` state, `fetchMatches`, `addMatch`
- The add-match form JSX and its `handleSubmit` usage for adding matches
- The `void fetchMatches()` call in the `useEffect`

Add:
- A new `LineupViewer` component rendered in the same panel slot that `MatchList` currently occupies (same outer panel classes: `flex flex-col h-100 rounded-3xl border border-slate-700 bg-slate-950/90 p-6 shadow-xl shadow-slate-950/20`).

## `LineupViewer` component

**Data (hardcoded, local to the component):**

Two teams, reusing the names already used elsewhere on this page for consistency ("Red Raptors", "Blue Titans"). Each team has 11 players in a 4-3-3 formation:

```
type LineupPlayer = { number: number; name: string; position: string; x: number; y: number };
type TeamLineup = { team: string; formation: string; players: LineupPlayer[] };
```

- `position` is a short label: GK, LB, CB, CB, RB, CM, CM, CM, LW, ST, RW.
- `x`/`y` are percentage coordinates (0–100) placing each player on the pitch, laid out by formation row (GK deepest, forwards furthest forward).

**Visual:**

- A pitch surface: green gradient background, a border, a center line and center circle drawn with CSS (border-radius circle + absolutely positioned line) — no image assets.
- Each player is an absolutely-positioned marker at `(x%, y%)`: a small circle showing the jersey number, with the player's name and position label beneath it.
- Team name and formation string (e.g. "Red Raptors — 4-3-3") shown centered at the top of the panel.

**Navigation:**

- Local state: `activeTeamIndex: 0 | 1`.
- Left arrow button pinned top-left of the panel, right arrow button pinned top-right. Each click moves to the other team (wraps, since there are exactly 2 teams).
- No scrolling, dragging, or swiping — navigation is button-only.
- The team name/formation label sits centered between the two arrows.

**Layout:**

- Fills the same panel height (`h-100`) previously used by the match list; the pitch graphic scales to fill available space via a responsive/percentage-based layout (no fixed pixel pitch size), consistent with the panel's existing rounded/bordered container style used elsewhere on the page.

## Out of scope / explicitly not doing

- No real lineup data or new backend endpoint (confirmed with user — mock data only).
- No swipe/scroll-based team switching (confirmed with user — arrow buttons only).
- No persistence of `activeTeamIndex` across page reloads.
- No changes to the `/matches` backend endpoint or `memory_db` — they simply become unused by the frontend after this change. (Not deleting backend code as part of this frontend-only spec.)

## Testing

No frontend test framework is configured for this repo (per `CLAUDE.md`). Verification is manual: run `npm run dev`, load `/stats?match_id=<id>`, confirm the pitch graphic renders for both teams and the arrow buttons toggle between them correctly at different viewport widths.
