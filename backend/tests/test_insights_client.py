import json
from unittest.mock import MagicMock, Mock

import pytest

import insights_client
from insights_client import generate_match_insights, _extract_bullets


def make_response(*blocks):
    response = Mock()
    response.content = list(blocks)
    response.stop_reason = "end_turn"
    response.usage = Mock(input_tokens=100, output_tokens=50)
    return response


def text_block(text):
    return Mock(type="text", text=text)


@pytest.fixture
def match_data():
    return {
        "id": 591,
        "home_team": "Manchester United",
        "away_team": "Liverpool",
        "date": "2024-04-07T15:30:00+00:00",
        "league": "Premier League",
        "venue_name": "Old Trafford",
        "goals": {"home": 3, "away": 1},
    }


@pytest.fixture
def mock_anthropic(monkeypatch):
    """Replace the Anthropic client with a mock whose stream yields a canned reply."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "fake_key")
    stream_cm = MagicMock()
    stream_cm.__enter__.return_value.get_final_message.return_value = make_response(
        text_block('Here is the context.\n["Bullet one.", "Bullet two."]')
    )
    client = Mock()
    client.messages.stream.return_value = stream_cm
    monkeypatch.setattr(insights_client.anthropic, "Anthropic", Mock(return_value=client))
    return client


def test_generate_match_insights(mock_anthropic, match_data):
    bullets = generate_match_insights(match_data)

    assert bullets == ["Bullet one.", "Bullet two."]

    call_kwargs = mock_anthropic.messages.stream.call_args.kwargs
    assert call_kwargs["model"] == insights_client.INSIGHTS_MODEL
    assert call_kwargs["tools"][0]["name"] == "web_search"
    # The match data must reach the prompt
    assert json.dumps(match_data) in call_kwargs["messages"][0]["content"]


def test_generate_match_insights_no_key(monkeypatch, match_data):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    with pytest.raises(ValueError):
        generate_match_insights(match_data)


def test_extract_bullets_ignores_search_blocks():
    response = make_response(
        Mock(type="server_tool_use"),
        Mock(type="web_search_tool_result"),
        text_block('["Only bullet."]'),
    )
    assert _extract_bullets(response) == ["Only bullet."]


def test_extract_bullets_uses_last_text_block():
    response = make_response(
        text_block("Searching for match reports..."),
        Mock(type="web_search_tool_result"),
        text_block('Based on coverage:\n["A.", "B.", "C."]'),
    )
    assert _extract_bullets(response) == ["A.", "B.", "C."]


def test_extract_bullets_no_json():
    response = make_response(text_block("Sorry, I could not find anything."))
    with pytest.raises(ValueError):
        _extract_bullets(response)


def test_extract_bullets_no_text():
    response = make_response(Mock(type="web_search_tool_result"))
    with pytest.raises(ValueError):
        _extract_bullets(response)
