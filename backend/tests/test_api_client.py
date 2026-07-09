from api_client import fetch_match_data, extract_match_info, MatchNotFoundError
import pytest
from unittest.mock import patch, Mock

@pytest.fixture
def mock_api_response():
    """Provides a fake API response payload for testing."""
    return {
        "response": [
            {
                "fixture": {
                    "venue": {"name": "Old Trafford"},
                    "id": 591,
                    "date": "2024-04-07T15:30:00+00:00"
                },
                "league": {"name": "Premier League"},
                "teams": {
                    "home": {"id": 33, "name": "Manchester United"},
                    "away": {"id": 40, "name": "Liverpool"}
                },
                "score": {
                    "fulltime": {"home": 3, "away": 1}
                },
                "statistics": [
                    {
                        "team": {"id": 33},
                        "statistics": [
                            {"type": "Shots on Goal", "value": 5},
                            {"type": "Total Shots", "value": 12},
                            {"type": "Ball Possession", "value": "60%"}
                        ]
                    },
                    {
                        "team": {"id": 40},
                        "statistics": [
                            {"type": "Shots on Goal", "value": 3},
                            {"type": "Total Shots", "value": 9},
                            {"type": "Ball Possession", "value": "40%"}
                        ]
                    }
                ]
            }
        ]
    }

def test_extract_match_info(mock_api_response):
    extracted_info = extract_match_info(mock_api_response)
    assert extracted_info == {
        "venue_name": "Old Trafford",
        "home_team": "Manchester United",
        "away_team": "Liverpool",
        "id": 591,
        "date": "2024-04-07T15:30:00+00:00",
        "league": "Premier League",
        "goals": {"home": 3, "away": 1},
        "possession": {"home": "60", "away": "40"},
        "shots_on_goal": {"home": 5, "away": 3},
        "shots_total": {"home": 12, "away": 9}
    }

def test_extract_match_info_missing_league(mock_api_response):
    del mock_api_response["response"][0]["league"]
    extracted_info = extract_match_info(mock_api_response)
    assert extracted_info["league"] is None

def test_extract_match_info_no_data():
    invalid_data = {"response": []}
    with pytest.raises(MatchNotFoundError):
        extract_match_info(invalid_data)

def test_fetch_match_data(monkeypatch):
    monkeypatch.setenv("API_FOOTBALL_KEY", "fake_api_key")
    mock_response = Mock()
    mock_response.json.return_value = {"response": ["fake data"]}
    mock_response.raise_for_status.return_value = None
    
    with patch("api_client.requests.get", return_value=mock_response) as mock_get:
        result = fetch_match_data(123)
    
    assert result == {"response": ["fake data"]}
    mock_get.assert_called_once_with(
        "https://v3.football.api-sports.io/fixtures",
        headers={"x-apisports-key": "fake_api_key"},
        params={"id": 123},
        timeout=10,
    )

@patch("api_client.requests.get")
def test_fetch_match_data_bad_response(mock_get, monkeypatch):
    monkeypatch.setenv("API_FOOTBALL_KEY", "fake_api_key")
    mock_response = Mock()
    mock_response.json.return_value = {
        "get": "fixtures",
        "parameters": {"id": "123"},
        "errors": {
            "token": "Error/Missing application key. Go to https://www.api-football.com/documentation-v3 to learn how to get your API application key."
        },
        "results": 0,
        "paging": {"current": 0, "total": 0},
        "response": []
    }
    mock_response.raise_for_status.return_value = None
    result = fetch_match_data(123)
    assert result["errors"] is not None

def test_fetch_match_data_no_key(monkeypatch):
    monkeypatch.delenv("API_FOOTBALL_KEY", raising=False)
    with pytest.raises(ValueError):
        fetch_match_data(123)
