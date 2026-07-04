import uvicorn
from fastapi import FastAPI
from typing import List
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from externalAPICalls import fetch_match_data

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
    return fetch_match_data(match_id)

@app.post("/matches", response_model=Match)
def create_match(match: Match):
    memory_db["matches"].append(match)
    return match