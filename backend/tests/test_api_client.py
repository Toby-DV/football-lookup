from api_client import (
    fetch_match_data,
    extract_match_info,
    MatchNotFoundError,
    fetch_lineup_data,
    extract_lineup_info,
    fetch_player_ratings,
    extract_top_performers,
)
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
                    "home": {"id": 33, "name": "Manchester United", "logo": "https://media.api-sports.io/football/teams/33.png"},
                    "away": {"id": 40, "name": "Liverpool", "logo": "https://media.api-sports.io/football/teams/40.png"}
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
        "home_logo": "https://media.api-sports.io/football/teams/33.png",
        "away_logo": "https://media.api-sports.io/football/teams/40.png",
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


@pytest.fixture
def mock_lineups_response():
    """Provides a fake /fixtures/lineups payload for testing."""
    return {
        "response": [
            {
                "team": {"id": 33, "name": "Manchester United"},
                "formation": "4-3-3",
                "startXI": [
                    {"player": {"id": 1, "name": "D. de Gea", "number": 1, "pos": "G", "grid": "1:1"}},
                    {"player": {"id": 2, "name": "H. Maguire", "number": 5, "pos": "D", "grid": "2:2"}},
                ],
            },
            {
                "team": {"id": 40, "name": "Liverpool"},
                "formation": "4-3-3",
                "startXI": [
                    {"player": {"id": 3, "name": "Alisson", "number": 1, "pos": "G", "grid": "1:1"}},
                ],
            },
        ]
    }


def test_extract_lineup_info(mock_lineups_response):
    extracted = extract_lineup_info(mock_lineups_response, "Manchester United", "Liverpool")
    assert extracted == {
        "home": {
            "team": "Manchester United",
            "formation": "4-3-3",
            "starting_eleven": [
                {"number": 1, "name": "D. de Gea", "position": "G", "grid": "1:1"},
                {"number": 5, "name": "H. Maguire", "position": "D", "grid": "2:2"},
            ],
        },
        "away": {
            "team": "Liverpool",
            "formation": "4-3-3",
            "starting_eleven": [
                {"number": 1, "name": "Alisson", "position": "G", "grid": "1:1"},
            ],
        },
    }


def test_extract_lineup_info_no_data():
    extracted = extract_lineup_info({"response": []}, "Manchester United", "Liverpool")
    assert extracted == {"home": None, "away": None}


def test_fetch_lineup_data(monkeypatch):
    monkeypatch.setenv("API_FOOTBALL_KEY", "fake_api_key")
    mock_response = Mock()
    mock_response.json.return_value = {"response": ["fake data"]}
    mock_response.raise_for_status.return_value = None

    with patch("api_client.requests.get", return_value=mock_response) as mock_get:
        result = fetch_lineup_data(591)

    assert result == {"response": ["fake data"]}
    mock_get.assert_called_once_with(
        "https://v3.football.api-sports.io/fixtures/lineups",
        headers={"x-apisports-key": "fake_api_key"},
        params={"fixture": 591},
        timeout=10,
    )


def test_fetch_lineup_data_no_key(monkeypatch):
    monkeypatch.delenv("API_FOOTBALL_KEY", raising=False)
    with pytest.raises(ValueError):
        fetch_lineup_data(591)


@pytest.fixture
def mock_player_ratings_response():
    """Provides a fake /fixtures/players payload for testing."""
    return {
        "response": [
            {
                "team": {"id": 33, "name": "Manchester United"},
                "players": [
                    {
                        "player": {"id": 1, "name": "D. de Gea", "photo": "https://media.api-sports.io/football/players/1.png"},
                        "statistics": [{"games": {"rating": "6.8"}}],
                    },
                    {
                        "player": {"id": 2, "name": "H. Maguire", "photo": "https://media.api-sports.io/football/players/2.png"},
                        "statistics": [{"games": {"rating": "7.5"}}],
                    },
                    {
                        "player": {"id": 3, "name": "Sub not used", "photo": "https://media.api-sports.io/football/players/3.png"},
                        "statistics": [{"games": {"rating": None}}],
                    },
                ],
            },
            {
                "team": {"id": 40, "name": "Liverpool"},
                "players": [
                    {
                        "player": {"id": 4, "name": "Alisson", "photo": "https://media.api-sports.io/football/players/4.png"},
                        "statistics": [{"games": {"rating": "8.1"}}],
                    },
                ],
            },
        ]
    }


def test_extract_top_performers(mock_player_ratings_response):
    top = extract_top_performers(mock_player_ratings_response, top_n=2)
    assert top == [
        {"name": "Alisson", "photo": "https://media.api-sports.io/football/players/4.png", "rating": 8.1},
        {"name": "H. Maguire", "photo": "https://media.api-sports.io/football/players/2.png", "rating": 7.5},
    ]


def test_extract_top_performers_no_data():
    assert extract_top_performers({"response": []}) == []


def test_fetch_player_ratings(monkeypatch):
    monkeypatch.setenv("API_FOOTBALL_KEY", "fake_api_key")
    mock_response = Mock()
    mock_response.json.return_value = {"response": ["fake data"]}
    mock_response.raise_for_status.return_value = None

    with patch("api_client.requests.get", return_value=mock_response) as mock_get:
        result = fetch_player_ratings(591)

    assert result == {"response": ["fake data"]}
    mock_get.assert_called_once_with(
        "https://v3.football.api-sports.io/fixtures/players",
        headers={"x-apisports-key": "fake_api_key"},
        params={"fixture": 591},
        timeout=10,
    )


def test_fetch_player_ratings_no_key(monkeypatch):
    monkeypatch.delenv("API_FOOTBALL_KEY", raising=False)
    with pytest.raises(ValueError):
        fetch_player_ratings(591)
