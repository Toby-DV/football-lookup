import os, requests, json
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
