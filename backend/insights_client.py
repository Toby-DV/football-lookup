import json
import os
import re

import anthropic
from dotenv import load_dotenv

load_dotenv()

INSIGHTS_MODEL = "claude-haiku-4-5"

# Haiku 4.5 doesn't support the dynamic-filtering web_search_20260209 variant
# (that requires Opus 4.8/4.7/4.6, Sonnet 5, or Sonnet 4.6) - use the basic tool.
WEB_SEARCH_TOOL = {"type": "web_search_20250305", "name": "web_search", "max_uses": 2}

SYSTEM_PROMPT = (
    "You write brief retrospective context for a finished football match. Search for match "
    "reports and reaction from around the fixture date; ground every claim in what you find.\n\n"
    "After your first search, judge the match's significance and scale your bullet count to it: "
    "1 bullet if obscure/low-stakes, 2 if it carried some importance, 3 if it was genuinely "
    "significant. Cover only angles that are actually interesting here - club stakes, players "
    "under pressure or praised/criticised after, tactics that proved significant. If you can't "
    "verify anything noteworthy, return [].\n\n"
    "Do not write any commentary between or around your searches - go straight from searching to "
    "the final answer. Reply with ONLY a JSON array of the bullet strings (each 1-2 sentences), "
    'e.g. ["First bullet."] - no preamble, no markdown, no citation tags, nothing after the array.'
)

# Safety net: web search grounding can make the model emit inline <cite index="...">text</cite>
# markup even when told not to - strip the tags but keep the cited text.
_CITE_TAG_RE = re.compile(r"</?cite(?:\s+[^>]*)?>")

def generate_match_insights(match: dict) -> list[str]:
    """Generate 'what this game meant' bullets for a finished match via the Claude API."""
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise ValueError("ANTHROPIC_API_KEY environment variable is not set")

    client = anthropic.Anthropic()

    # Web-search turns can run long; streaming avoids HTTP timeouts.
    with client.messages.stream(
        model=INSIGHTS_MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        tools=[WEB_SEARCH_TOOL],
        messages=[{"role": "user", "content": f"Match data:\n{json.dumps(match)}"}],
    ) as stream:
        response = stream.get_final_message()

    return _extract_bullets(response)


def _extract_bullets(response) -> list[str]:
    """Pull the JSON bullet array out of the reply's final text block."""
    text_blocks = [block.text for block in response.content if block.type == "text"]
    if not text_blocks:
        raise ValueError(f"No text in insights response (stop_reason={response.stop_reason})")

    # Web-search result blocks are interleaved; the bullets are at the end of the last text block.
    text = text_blocks[-1]
    start, end = text.find("["), text.rfind("]")
    if start == -1 or end == -1:
        raise ValueError("Insights response did not contain a JSON array")

    bullets = json.loads(text[start:end + 1])
    if not isinstance(bullets, list) or not all(isinstance(b, str) for b in bullets):
        raise ValueError("Insights response JSON was not an array of strings")
    if not bullets:
        raise ValueError("Model returned no verifiable insights")
    return [_CITE_TAG_RE.sub("", b).strip() for b in bullets]
