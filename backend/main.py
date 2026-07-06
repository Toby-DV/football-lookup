from fastapi import FastAPI
from typing import List
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from backend.db_models import MatchRecord
from backend.database import SessionLocal
from backend.api_client import extract_match_info

from backend.api_client import fetch_match_data

class Match(BaseModel):
    name: str

class MatchList(BaseModel):
    matches: List[Match]

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app = FastAPI()
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
        cache_response = db.get(MatchRecord, match_id)

    if cache_response:
        data = {
            "id": cache_response.id,
            "venue_name": cache_response.venue_name,
            "home_team": cache_response.home_team,
            "away_team": cache_response.away_team
        }

    else:
        data = extract_match_info(fetch_match_data(match_id))
        cache_match_record(data["id"], data["venue_name"], data["home_team"], data["away_team"])
    
    return data

@app.post("/matches", response_model=Match)
def create_match(match: Match):
    memory_db["matches"].append(match)
    return match

def cache_match_record(id, venue, home_team, away_team):
    db = SessionLocal()
    record = MatchRecord(id=id, venue_name=venue, home_team=home_team, away_team=away_team)
    db.add(record)
    db.commit()
    db.close()

if __name__ == "__main__":
    # print(get_external_match(123))
    pass