from sqlalchemy import Column, Integer, String, Text

from database import Base


class MatchRecord(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True)
    venue_name = Column(String, nullable=True)
    home_team = Column(String, nullable=False)
    away_team = Column(String, nullable=False)
    date = Column(String, nullable=True)
    league = Column(String, nullable=True)
    # JSON-encoded list of insight bullet strings; NULL = not generated yet
    insights = Column(Text, nullable=True)
    # JSON-encoded {"home": {...}, "away": {...}} starting XI lineups; NULL = not fetched yet
    lineups = Column(Text, nullable=True)
    home_goals = Column(Integer, nullable=False)
    away_goals = Column(Integer, nullable=False)
    home_shots_on_goal = Column(Integer, nullable=True)
    away_shots_on_goal = Column(Integer, nullable=True)
    home_shots_total = Column(Integer, nullable=True)
    away_shots_total = Column(Integer, nullable=True)
    home_possession = Column(Integer, nullable=True)
    away_possession = Column(Integer, nullable=True)