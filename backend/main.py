import uvicorn
from fastapi import FastAPI
from typing import List
from pydantic import BaseModel

class Match(BaseModel):
    name: str

class MatchList(BaseModel):
    matches: List[Match]

app = FastAPI()
memory_db = {"matches": []}

@app.get("/")
def read_root():
    return {"message": "api is running"}

@app.get("/matches", response_model=MatchList)
def get_matches():
    return MatchList(matches=memory_db["matches"])

@app.post("/matches", response_model=Match)
def create_match(match: Match):
    memory_db["matches"].append(match)
    return match