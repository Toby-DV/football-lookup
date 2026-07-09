import os, requests
from pprint import pprint
from typing import Any, Dict
from dotenv import load_dotenv
    
API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io"
load_dotenv()

class MatchNotFoundError(Exception):
    '''Raised when api-football does not return a match'''

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

def fetch_lineup_data(match_id: int) -> Dict[str, Any]:
    """Fetch starting lineups from API-Football for a specific fixture."""
    api_key = os.getenv("API_FOOTBALL_KEY")
    if not api_key:
        raise ValueError("API_FOOTBALL_KEY environment variable is not set")

    # do not add any more headers or api-football will not respond
    headers = {
        "x-apisports-key": api_key,
    }
    response = requests.get(
        f"{API_FOOTBALL_BASE_URL}/fixtures/lineups",
        headers=headers,
        params={"fixture": match_id},
        timeout=10,
    )

    response.raise_for_status()
    return response.json()

def _get_team_stats(statistics, team_id):
    '''Find one team's statistics list within the fixture's "statistics" block, by team id.'''
    for team_block in statistics:
        if team_block["team"]["id"] == team_id:
            return team_block["statistics"]
    return None

def _get_team_players(players, team_id):
    for team_block in players:
        if team_block["team"]["id"] == team_id:
            return team_block["players"]
    return None

def _get_stat_value(team_statistics, stat_type):
    '''Find a stat's value by its "type" name within one team's statistics list.'''
    if team_statistics is None:
        return None
    for stat in team_statistics:
        if stat["type"] == stat_type:
            return stat["value"]
    return None

def extract_match_info(data):
    '''Extract relevant match information from the raw API response.'''
    if not data["response"]:
        raise MatchNotFoundError(data.get("errors"))

    match_data = data["response"][0]
    venue_name = match_data["fixture"]["venue"]["name"]
    home_team = match_data["teams"]["home"]["name"]
    away_team = match_data["teams"]["away"]["name"]
    goals = match_data["score"]["fulltime"]
    id = match_data["fixture"]["id"]
    date = match_data["fixture"].get("date")
    league = (match_data.get("league") or {}).get("name")

    # statistics is absent for some competitions/plans, so fall back to []
    statistics = match_data.get("statistics") or []
    home_stats = _get_team_stats(statistics, match_data["teams"]["home"]["id"])
    away_stats = _get_team_stats(statistics, match_data["teams"]["away"]["id"])

    home_possession = _get_stat_value(home_stats, "Ball Possession")
    away_possession = _get_stat_value(away_stats, "Ball Possession")
    home_possession = home_possession.replace("%", "") if home_possession is not None else None
    away_possession = away_possession.replace("%", "") if away_possession is not None else None
    home_shots_on_goal = _get_stat_value(home_stats, "Shots on Goal")
    away_shots_on_goal = _get_stat_value(away_stats, "Shots on Goal")
    home_shots_total = _get_stat_value(home_stats, "Total Shots")
    away_shots_total = _get_stat_value(away_stats, "Total Shots")

    return {
        "id": id,
        "venue_name": venue_name,
        "home_team": home_team,
        "away_team": away_team,
        "date": date,
        "league": league,
        "goals": goals,
        "possession": {"home": home_possession, "away": away_possession},
        "shots_on_goal": {"home": home_shots_on_goal, "away": away_shots_on_goal},
        "shots_total": {"home": home_shots_total, "away": away_shots_total}
    }

def _shape_team_lineup(team_block):
    '''Shape one team's block from the /fixtures/lineups response into formation + starting XI.'''
    starting_eleven = [
        {
            "number": entry["player"]["number"],
            "name": entry["player"]["name"],
            "position": entry["player"]["pos"],
            "grid": entry["player"]["grid"],
        }
        for entry in team_block.get("startXI") or []
    ]
    return {
        "team": team_block["team"]["name"],
        "formation": team_block.get("formation"),
        "starting_eleven": starting_eleven,
    }

def extract_lineup_info(data, home_team, away_team):
    '''Extract each team's starting XI from the raw /fixtures/lineups response.

    Lineups aren't tagged home/away in the API response, so team blocks are
    matched by name against the fixture's already-known home/away team names.
    Absent for some competitions/plans (like statistics), so both sides
    default to None rather than raising.
    '''
    home = away = None
    for team_block in data.get("response") or []:
        name = team_block["team"]["name"]
        if name == home_team:
            home = _shape_team_lineup(team_block)
        elif name == away_team:
            away = _shape_team_lineup(team_block)
    return {"home": home, "away": away}

if __name__ == "__main__":
    pass