import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import main
from database import Base
from db_models import MatchRecord


@pytest.fixture
def raw_api_payload():
    """Raw API-Football fixture payload, as returned by fetch_match_data."""
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


@pytest.fixture
def db_session_factory(monkeypatch):
    """Point main.SessionLocal at a fresh in-memory SQLite database.

    StaticPool + check_same_thread=False make every session share the single
    in-memory connection, so data written by the app is visible to the test.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    monkeypatch.setattr(main, "SessionLocal", factory)
    yield factory
    engine.dispose()


@pytest.fixture
def client(db_session_factory, monkeypatch):
    # Reset the in-memory match list so tests don't leak into each other.
    monkeypatch.setitem(main.memory_db, "matches", [])
    # No `with` block: entering the context would run the lifespan handler,
    # which calls create_all against the real (Postgres) engine.
    return TestClient(main.app)


def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "api is running"}


def test_create_and_list_matches(client):
    assert client.get("/matches").json() == {"matches": []}

    response = client.post("/matches", json={"name": "United vs Liverpool"})
    assert response.status_code == 200
    assert response.json() == {"name": "United vs Liverpool"}

    response = client.get("/matches")
    assert response.json() == {"matches": [{"name": "United vs Liverpool"}]}


def test_external_match_fetched_and_cached(client, db_session_factory, raw_api_payload, monkeypatch):
    calls = []

    def fake_fetch(match_id):
        calls.append(match_id)
        return raw_api_payload

    monkeypatch.setattr(main, "fetch_match_data", fake_fetch)

    response = client.get("/matches/external", params={"match_id": 591})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 591
    assert data["venue_name"] == "Old Trafford"
    assert data["home_team"] == "Manchester United"
    assert data["away_team"] == "Liverpool"
    assert data["date"] == "2024-04-07T15:30:00+00:00"
    assert data["league"] == "Premier League"
    assert data["goals"] == {"home": 3, "away": 1}
    assert calls == [591]

    with db_session_factory() as db:
        record = db.get(MatchRecord, 591)
    assert record is not None
    assert record.home_team == "Manchester United"
    assert record.home_possession == 60


def test_external_match_served_from_cache(client, db_session_factory, raw_api_payload, monkeypatch):
    calls = []

    def fake_fetch(match_id):
        calls.append(match_id)
        return raw_api_payload

    monkeypatch.setattr(main, "fetch_match_data", fake_fetch)

    first = client.get("/matches/external", params={"match_id": 591}).json()
    second = client.get("/matches/external", params={"match_id": 591}).json()

    # Only the first request should hit the external API.
    assert calls == [591]
    assert second["id"] == first["id"]
    assert second["goals"] == first["goals"]
    assert second["shots_on_goal"] == first["shots_on_goal"]


def test_external_match_not_found(client, monkeypatch):
    monkeypatch.setattr(main, "fetch_match_data", lambda match_id: {"response": []})

    response = client.get("/matches/external", params={"match_id": 999})
    assert response.status_code == 404


def test_insights_generated_and_cached(client, db_session_factory, raw_api_payload, monkeypatch):
    monkeypatch.setattr(main, "fetch_match_data", lambda match_id: raw_api_payload)
    calls = []

    def fake_generate(match):
        calls.append(match)
        return ["Bullet one.", "Bullet two."]

    monkeypatch.setattr(main, "generate_match_insights", fake_generate)

    first = client.get("/matches/insights", params={"match_id": 591})
    assert first.status_code == 200
    assert first.json() == {"match_id": 591, "bullets": ["Bullet one.", "Bullet two."]}
    # The generator receives the full match context
    assert calls[0]["home_team"] == "Manchester United"
    assert calls[0]["date"] == "2024-04-07T15:30:00+00:00"

    # Second request is served from the DB without regenerating
    second = client.get("/matches/insights", params={"match_id": 591})
    assert second.json() == first.json()
    assert len(calls) == 1

    with db_session_factory() as db:
        record = db.get(MatchRecord, 591)
    assert record.insights == '["Bullet one.", "Bullet two."]'


def test_insights_for_already_cached_match(client, db_session_factory, raw_api_payload, monkeypatch):
    fetch_calls = []

    def fake_fetch(match_id):
        fetch_calls.append(match_id)
        return raw_api_payload

    monkeypatch.setattr(main, "fetch_match_data", fake_fetch)
    monkeypatch.setattr(main, "generate_match_insights", lambda match: ["Cached-stats bullet."])

    # Stats endpoint caches the match first; insights must reuse that record
    client.get("/matches/external", params={"match_id": 591})
    response = client.get("/matches/insights", params={"match_id": 591})

    assert response.json()["bullets"] == ["Cached-stats bullet."]
    assert fetch_calls == [591]


def test_insights_match_not_found(client, monkeypatch):
    monkeypatch.setattr(main, "fetch_match_data", lambda match_id: {"response": []})

    response = client.get("/matches/insights", params={"match_id": 999})
    assert response.status_code == 404
