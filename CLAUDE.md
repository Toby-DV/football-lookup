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
- `backend/` — FastAPI app that proxies to the API-Football external API, caches fetched match data in Postgres (SQLAlchemy), keeps a small in-memory "matches" list, and generates per-match narrative insights via the Claude API

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

### Backend (run from `backend/`)
Dependencies are pinned in `backend/requirements.txt` (includes `pytest` and `httpx`, which the test suite needs); the venv lives at `backend/.venv`.

```bash
docker compose up -d                     # start local Postgres (demo/demo/demo on :5432)
uvicorn main:app --reload --port 8000    # run the API (http://localhost:8000)
python -m pytest tests/                                        # run all tests
python -m pytest tests/test_api_client.py::test_extract_match_info -v   # single test
```

**Import/path rules:** all backend imports are bare (`from api_client import ...`), so `backend/` must be on `sys.path`:
- Run `uvicorn` and `pytest` from inside `backend/`, not the repo root.
- Always use `python -m pytest`, never the bare `pytest` executable — `python -m` adds the current directory to `sys.path`; the console script does not.
- The empty `backend/conftest.py` exists so pytest also works when launched from the repo root (e.g. the VS Code Testing tab, configured in `.vscode/settings.json`): pytest prepends a non-package conftest's directory to `sys.path`.

Backend requires a `backend/.env` file (gitignored) with `API_FOOTBALL_KEY` (used by `backend/api_client.py`) and `ANTHROPIC_API_KEY` (used by `backend/insights_client.py`), both loaded via `python-dotenv`. `DATABASE_URL` is optional and defaults to the docker-compose Postgres (`postgresql+psycopg://demo:demo@localhost:5432/demo`).

**Schema changes:** `Base.metadata.create_all` never alters existing tables — after adding a column to `MatchRecord`, reset the local DB with `docker compose down -v && docker compose up -d` (CI creates tables fresh every run).

## Architecture

**Request flow:** `frontend/src/app/page.tsx` (client component) calls the FastAPI backend through the shared axios instance in `frontend/src/app/api.ts`, which is hardcoded to `http://127.0.0.1:8000`. The backend (`backend/main.py`) only allows CORS from `http://localhost:3000` and `http://localhost:5173` — update both the axios `baseURL` and the FastAPI `origins` list together if ports change.

**Backend state — two layers:**
- `memory_db` dict in `backend/main.py` backs `GET /matches` / `POST /matches` (a simple name list); it resets on every restart.
- Postgres backs `GET /matches/external?match_id=...`: `fetch_match_record()` returns the cached `MatchRecord` (table `matches`) or, on a miss, calls `api_client.fetch_match_data`, shapes the result with `extract_match_info`, and persists it. `match_record_to_dict()` builds the response, so cached and fresh responses are shape-identical. Tables are created by the app's lifespan handler (`Base.metadata.create_all`).
- `GET /matches/insights?match_id=...` returns "what this game meant" bullets: cached in `MatchRecord.insights` (JSON-encoded list, `NULL` = not generated); on a miss it calls `insights_client.generate_match_insights` — slow (~15–60s, uses web search), which is why it's a separate endpoint the frontend calls after the stats render. Finished matches are immutable, so insights are generated once per match, ever.
- `backend/database.py` owns the engine/`SessionLocal`/`Base` (reads `DATABASE_URL` at import time); `backend/db_models.py` defines `MatchRecord`.

**External API layer:** `backend/api_client.py` is the only module that talks to API-Football. `extract_match_info()` shapes the raw fixture response (`response[0]` → fixture/league/teams/score/statistics) into a flat dict with date, league, goals, possession, and shots.

**LLM layer:** `backend/insights_client.py` is the only module that talks to the Claude API (`claude-sonnet-5` with the server-side `web_search_20260209` tool, via `client.messages.stream`). It prompts for contemporaneous match reports and parses a JSON array of bullet strings out of the reply's final text block.

**Tests (`backend/tests/`):**
- `test_api_client.py` — the `extract_match_info` transform and `fetch_match_data` request/error behavior, with inline fixture payloads (`test_data.json` is an unused leftover).
- `test_main.py` — endpoint tests via FastAPI `TestClient`, with `main.SessionLocal` monkeypatched to an in-memory SQLite engine and `main.fetch_match_data` / `main.generate_match_insights` monkeypatched directly — running tests requires neither Postgres nor any API key. It deliberately avoids using `TestClient` as a context manager so the lifespan handler never touches the real engine.
- `test_insights_client.py` — mocks the `anthropic` client; covers prompt contents, JSON extraction from mixed content blocks, and the missing-key error.

**Scope: finished matches only.** This project is not built to support live/in-progress matches — it only deals with completed fixtures. That assumption is why match data (scoreline, possession, venue, teams) is treated as immutable and safe to cache indefinitely once fetched: there's no live state to keep in sync, no polling for score updates, and no need for cache invalidation/TTLs. Don't add live-match features (polling, websockets, "in-play" status handling) without revisiting this assumption first.

## CI

`.github/workflows/main.yml` runs on PRs/pushes to `main`, in a single job with a `postgres:16` service container:
1. Node 24 + Python 3.14.5 setup
2. `pip install -r requirements.txt` in `backend/`
3. starts `uvicorn main:app` in the background (its lifespan handler creates tables in the service Postgres)
4. frontend: `npm ci`, `npm run lint`, `npm run build`
5. backend tests: creates tables via a `python -c` one-liner, then `python -m pytest tests/` from `backend/` (the tests themselves use SQLite, so they don't depend on the Postgres service)
