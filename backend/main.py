from fastapi import FastAPI, HTTPException
from typing import List
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from database import SessionLocal, Base, engine
from api_client import extract_match_info, MatchNotFoundError
from db_models import MatchRecord


from api_client import fetch_match_data

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

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(engine)

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
            try:
                data = extract_match_info(fetch_match_data(match_id))
                cache_match_record(data["id"], data["venue_name"], data["home_team"], data["away_team"], data["goals"]["home"], data["goals"]["away"])

            except MatchNotFoundError as e:
                raise HTTPException(status_code=404, detail=f"Get_external_match: match not found {e}")

    return data

@app.post("/matches", response_model=Match)
def create_match(match: Match):
    memory_db["matches"].append(match)
    return match

def cache_match_record(id, venue_name, home_team, away_team, home_goals, away_goals):
    record = MatchRecord(id=id, venue_name=venue_name, home_team=home_team, away_team=away_team, home_goals=home_goals, away_goals=away_goals)
    with SessionLocal() as db:
        db.add(record)
        db.commit()

if __name__ == "__main__":
    # print(get_external_match(124))
    pass