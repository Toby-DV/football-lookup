from backend.api_client import fetch_match_data, extract_match_info
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
                    "id": 591
                },
                "teams": {
                    "home": {"name": "Manchester United"},
                    "away": {"name": "Liverpool"}
                }
            }
        ]
    }

def test_extract_match_info(mock_api_response):
    extracted_info = extract_match_info(mock_api_response)
    assert extracted_info == {
        "venue_name": "Old Trafford",
        "home_team": "Manchester United",
        "away_team": "Liverpool",
        "id": 591
    }

def test_extract_match_info_no_data():
    invalid_data = {"response": []}
    with pytest.raises(IndexError):
        extract_match_info(invalid_data)


def test_fetch_match_data(monkeypatch):
    monkeypatch.setenv("API_FOOTBALL_KEY", "fake_api_key")
    mock_response = Mock()
    mock_response.json.return_value = {"response": ["fake data"]}
    mock_response.raise_for_status.return_value = None
    
    with patch("backend.api_client.requests.get", return_value=mock_response) as mock_get:
        result = fetch_match_data(123)
    
    assert result == {"response": ["fake data"]}
    mock_get.assert_called_once_with(
        "https://v3.football.api-sports.io/fixtures",
        headers={"x-apisports-key": "fake_api_key"},
        params={"id": 123},
        timeout=10,
    )

@patch("backend.api_client.requests.get")
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
    