import os, requests
from pprint import pprint
from typing import Any, Dict
from dotenv import load_dotenv
    
API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io"
load_dotenv()

def fetch_match_data(match_id: int) -> Dict[str, Any]:
    """Fetch match data from API-Football for a specific match ID."""
    api_key = os.getenv("API_FOOTBALL_KEY")
    if not api_key:
        raise ValueError("API_FOOTBALL_KEY environment variable is not set")

    # do not add any more headers or api-football will not respond
    headers = {
        "x-apisports-key": api_key,
    }
    response = requests.get(
        f"{API_FOOTBALL_BASE_URL}/fixtures",
        headers=headers,
        params={"id": match_id},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()

def extract_match_info(match_data):
    '''Extract relevant match information from the raw API response.'''
    match_data = match_data["response"][0]
    venue_name = match_data["fixture"]["venue"]["name"]
    home_team = match_data["teams"]["home"]["name"]
    away_team = match_data["teams"]["away"]["name"]
    id = match_data["fixture"]["id"]
    
    return {
        "id": id,
        "venue_name": venue_name,
        "home_team": home_team,
        "away_team": away_team
    }

if __name__ == "__main__":
    pass