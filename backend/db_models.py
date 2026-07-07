from sqlalchemy import Column, Integer, String

from backend.database import Base


class MatchRecord(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True)
    venue_name = Column(String, nullable=True)
    home_team = Column(String, nullable=False)
    away_team = Column(String, nullable=False)
