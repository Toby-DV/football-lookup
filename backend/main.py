import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from typing import List
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from database import SessionLocal, Base, engine
from api_client import extract_match_info, fetch_team_id, fetch_match_by_teams, extract_match_info_summary, MatchNotFoundError
from db_models import MatchRecord
from insights_client import generate_match_insights
from sqlalchemy.exc import IntegrityError

from api_client import (
    fetch_match_data,
    fetch_lineup_data,
    extract_lineup_info,
    extract_top_performers,
    fetch_player_ratings,
)

class Match(BaseModel):
    name: str

class MatchList(BaseModel):
    matches: List[Match]

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    yield

app = FastAPI(lifespan=lifespan)
memory_db = {"matches": []}

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "api is running"}

@app.get("/matches", response_model=MatchList)
def get_matches():
    return MatchList(matches=memory_db["matches"])

@app.get("/matches/external")
def get_external_match(match_id: int):
    with SessionLocal() as db:
        try:
            record = fetch_match_record(db, match_id)
        except MatchNotFoundError as e:
            raise HTTPException(status_code=404, detail=f"Get_external_match: match not found {e}")
        try:
            data = match_record_to_dict(record)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Get_external_match: Match fetch failed {e}")

    return data

@app.get("/matches/insights")
def get_match_insights(match_id: int):
    with SessionLocal() as db:
        try:
            record = fetch_match_record(db, match_id)
        except MatchNotFoundError as e:
            raise HTTPException(status_code=404, detail=f"Get_match_insights: match not found {e}")

        if record.insights is None:
            try:
                bullets = generate_match_insights(match_record_to_dict(record))
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Insights generation failed: {e}")
            record.insights = json.dumps(bullets)
            db.commit()
        else:
            bullets = json.loads(record.insights)

    return {"match_id": match_id, "bullets": bullets}

@app.get("/matches/lineups")
def get_match_lineups(match_id: int):
    with SessionLocal() as db:
        try:
            record = fetch_match_record(db, match_id)
        except MatchNotFoundError as e:
            raise HTTPException(status_code=404, detail=f"Get_match_lineups: match not found {e}")

        if record.lineups is None:
            try:
                lineups = extract_lineup_info(fetch_lineup_data(match_id), record.home_team, record.away_team)
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Lineup fetch failed: {e}")
            record.lineups = json.dumps(lineups)
            db.commit()
        else:
            lineups = json.loads(record.lineups)

    return {"match_id": match_id, **lineups}

@app.get("/matches/search")
def get_external_match_search(team_1: str, team_2: str, season: int):
    try:
        t1_id = fetch_team_id(team_1)
        t2_id = fetch_team_id(team_2)
        data = extract_match_info_summary(fetch_match_by_teams(t1_id, t2_id, season))
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Get_external_match_search: error finding match {e}")

    return data

@app.get("/matches/top-performers")
def get_top_performers(match_id: int):
    with SessionLocal() as db:
        try:
            record = fetch_match_record(db, match_id)
        except MatchNotFoundError as e:
            raise HTTPException(status_code=404, detail=f"Get_top_performers: match not found {e}")

        if record.top_performers is None:
            try:
                players = extract_top_performers(fetch_player_ratings(match_id))
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Top performers fetch failed: {e}")
            record.top_performers = json.dumps(players)
            db.commit()
        else:
            players = json.loads(record.top_performers)

    return {"match_id": match_id, "players": players}

@app.post("/matches", response_model=Match)
def create_match(match: Match):
    memory_db["matches"].append(match)
    return match

def fetch_match_record(db, match_id: int) -> MatchRecord:
    """Return the cached MatchRecord, fetching from API-Football / caching on a cache miss."""
    record = db.get(MatchRecord, match_id)
    if record is None:
        data = extract_match_info(fetch_match_data(match_id)) # fetch externally
        record = MatchRecord(
            id=data["id"], venue_name=data["venue_name"],
            home_team=data["home_team"], away_team=data["away_team"],
            home_logo=data["home_logo"], away_logo=data["away_logo"],
            date=data["date"], league=data["league"],
            home_goals=data["goals"]["home"], away_goals=data["goals"]["away"],
            home_possession=int(data["possession"]["home"]) if data["possession"]["home"] is not None else None,
            away_possession=int(data["possession"]["away"]) if data["possession"]["away"] is not None else None,
            home_shots_on_goal=data["shots_on_goal"]["home"],
            away_shots_on_goal=data["shots_on_goal"]["away"],
            home_shots_total=data["shots_total"]["home"],
            away_shots_total=data["shots_total"]["away"],
        )
        db.add(record)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            record = db.get(MatchRecord, match_id)
    return record

def match_record_to_dict(record: MatchRecord) -> dict:
    return {
        "id": record.id,
        "venue_name": record.venue_name,
        "home_team": record.home_team,
        "away_team": record.away_team,
        "home_logo": record.home_logo,
        "away_logo": record.away_logo,
        "date": record.date,
        "league": record.league,
        "goals": {"home": record.home_goals, "away": record.away_goals},
        "possession": {"home": record.home_possession, "away": record.away_possession},
        "shots_on_goal": {"home": record.home_shots_on_goal, "away": record.away_shots_on_goal},
        "shots_total": {"home": record.home_shots_total, "away": record.away_shots_total},
    }

if __name__ == "__main__":
    pass