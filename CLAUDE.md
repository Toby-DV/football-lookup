# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working with this project

This repo is a personal learning project — the user is building it hands-on to learn, not delegating implementation. Adjust behavior accordingly:

- **Don't write or edit code proactively.** Explain the approach, tradeoffs, and best practice; let the user write the code themselves. Only make edits when the user explicitly asks you to implement or fix something.
- **Answer directly.** When asked a technical question, give a clear recommendation instead of front-loading clarifying questions. State any assumptions inline and move on.
- **Keep explanations skimmable.** Use short sections/bullets over dense prose, and include a code snippet only when it's the clearest way to make the point.

## Repository layout

This is a two-part demo app in one repo, developed as separate `frontend/` and `backend/` projects (no shared package manager or root-level tooling):

- `frontend/` — Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4
- `backend/` — FastAPI app that serves an in-memory "matches" list and proxies to the API-Football external API

There is a project-specific `frontend/CLAUDE.md` (which itself just points to `frontend/AGENTS.md`) — read it when working inside `frontend/`. It warns that this Next.js version has breaking changes vs. training data and to check `frontend/node_modules/next/dist/docs/` before writing Next.js code.

## Commands

### Frontend (run from `frontend/`)
```bash
npm install       # install deps
npm run dev       # start dev server (http://localhost:3000)
npm run build     # production build
npm run lint      # eslint (flat config in eslint.config.mjs)
```
There is no frontend test script/framework configured.

### Backend (run from the repo root)
There is no `requirements.txt`; a `.venv` exists with dependencies already installed (fastapi, uvicorn, pydantic, requests, python-dotenv). CI installs only `fastapi uvicorn pydantic` manually (see `.github/workflows/main.yml`) — `pytest` is not installed anywhere, so add it (`pip install pytest`) before running the test suite.

```bash
uvicorn backend.main:app --reload --port 8000   # run the API (http://localhost:8000)
python -m pytest backend/tests/                                                  # run all tests
python -m pytest backend/tests/test_api_client.py::test_extract_match_info -v    # single test
```
`main.py` and `test_api_client.py` both import via `from backend.api_client import ...`, which requires the repo root (not `backend/`) to be on `sys.path` — so both `uvicorn` and `pytest` must be invoked from the repo root, not from inside `backend/`.

Always run pytest as `python -m pytest`, never the bare `pytest` executable: `python -m` makes Python add the current working directory to `sys.path` automatically, while the `pytest` console script does not — running it directly (even from the repo root) fails collection with `ModuleNotFoundError: No module named 'backend'`.

Backend requires a `backend/.env` file with `API_FOOTBALL_KEY` set (used by `backend/api_client.py` via `python-dotenv`); it's gitignored.

## Architecture

**Request flow:** `frontend/src/app/page.tsx` (client component) calls the FastAPI backend through the shared axios instance in `frontend/src/app/api.ts`, which is hardcoded to `http://127.0.0.1:8000`. The backend (`backend/main.py`) only allows CORS from `http://localhost:3000` and `http://localhost:5173` — update both the axios `baseURL` and the FastAPI `origins` list together if ports change.

**Backend state:** `backend/main.py` keeps matches in a process-local `memory_db` dict (no database) — data resets on every backend restart:
- `GET /matches` — list matches from `memory_db`
- `POST /matches` — append a `Match` to `memory_db`
- `GET /matches/external?match_id=...` — bypasses `memory_db` and calls `api_client.fetch_match_data`, which hits the real API-Football `/fixtures` endpoint using `API_FOOTBALL_KEY`

**External API layer:** `backend/api_client.py` is the only module that talks to API-Football. `extract_match_info()` shapes the raw API-Football fixture response (`response[0].fixture/teams`) into a flat dict — this is the transform tested by `backend/tests/test_api_client.py` against the fixture in `backend/tests/testData.json`.

**Scope: finished matches only.** This project is not built to support live/in-progress matches — it only deals with completed fixtures. That assumption is why match data (scoreline, possession, venue, teams) is treated as immutable and safe to cache indefinitely once fetched: there's no live state to keep in sync, no polling for score updates, and no need for cache invalidation/TTLs. Don't add live-match features (polling, websockets, "in-play" status handling) without revisiting this assumption first.

## CI

`.github/workflows/main.yml` runs on PRs/pushes to `main`: sets up Node 24 and Python 3.14.5, installs backend deps ad hoc (not from a requirements file), starts `uvicorn main:app` in the background, then in `frontend/` runs `npm ci`, `npm run lint`, and `npm run build`. It does not currently run backend tests or frontend against the live backend beyond starting it.