"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import api from "../api";

type ApiLineupPlayer = { number: number; name: string; position: string; grid: string };
type TeamLineup = { team: string; formation: string; starting_eleven: ApiLineupPlayer[] };
type PositionedPlayer = { number: number; name: string; x: number; y: number };

// Converts each player's "row:col" grid slot (row 1 = goalkeeper, increasing
// rows move upfield) into pitch percentage coordinates: row picks the vertical
// band, column position within that row spaces players evenly left-to-right.
function layoutFormation(players: ApiLineupPlayer[]): PositionedPlayer[] {
  const byRow = new Map<number, { number: number; name: string; col: number }[]>();
  let maxRow = 1;
  for (const player of players) {
    const [rowStr, colStr] = player.grid.split(":");
    const row = Number(rowStr);
    maxRow = Math.max(maxRow, row);
    const rowPlayers = byRow.get(row) ?? [];
    rowPlayers.push({ number: player.number, name: player.name, col: Number(colStr) });
    byRow.set(row, rowPlayers);
  }

  const positioned: PositionedPlayer[] = [];
  for (const [row, rowPlayers] of byRow) {
    const y = maxRow === 1 ? 50 : 90 - ((row - 1) / (maxRow - 1)) * 80;
    const sorted = [...rowPlayers].sort((a, b) => a.col - b.col);
    sorted.forEach((player, index) => {
      const x = ((index + 1) / (sorted.length + 1)) * 100;
      positioned.push({ number: player.number, name: player.name, x, y });
    });
  }
  return positioned;
}

export default function Stats() {
  return (
    <Suspense fallback={null}>
      <StatsContent />
    </Suspense>
  );
}

type LineupViewerProps = {
  loading: boolean;
  error: string | null;
  home: TeamLineup | null;
  away: TeamLineup | null;
};

const LineupViewer = ({ loading, error, home, away }: LineupViewerProps) => {
  const teams = [home, away].filter((team): team is TeamLineup => team !== null);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);

  if (loading) {
    return <p className="animate-pulse text-sm text-slate-400">Loading lineups…</p>;
  }
  if (error) {
    return <p className="text-sm text-slate-400">{error}</p>;
  }
  if (teams.length === 0) {
    return <p className="text-sm text-slate-400">Lineups not available for this match.</p>;
  }

  const lineup = teams[activeTeamIndex];
  const players = layoutFormation(lineup.starting_eleven);

  const goToTeam = (direction: -1 | 1) => {
    setActiveTeamIndex((prev) => (prev + direction + teams.length) % teams.length);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToTeam(-1)}
          aria-label="Previous team"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300"
        >
          &#8592;
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{lineup.team}</p>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{lineup.formation}</p>
        </div>
        <button
          type="button"
          onClick={() => goToTeam(1)}
          aria-label="Next team"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300"
        >
          &#8594;
        </button>
      </div>

      <div className="relative mt-4 flex-1 overflow-hidden rounded-2xl border border-emerald-900/60 bg-gradient-to-b from-emerald-800/50 to-emerald-950/60">
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-emerald-100/20" />
        <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-100/20" />

        {players.map((player) => (
          <div
            key={player.number}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${player.x}%`, top: `${player.y}%` }}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/90 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/40">
              {player.number}
            </div>
            <p className="text-center text-[11px] font-medium leading-tight text-white">{player.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

function StatsContent() {
  type MatchInfo = {
    id: number;
    venue_name: string;
    home_team: string;
    away_team: string;
    goals: {
      home: number | null;
      away: number | null;
    };
    shots_on_goal: {
      home: number;
      away: number;
    };
    shots_total: {
      home: number;
      away: number;
    };
    possession: {
      home: number;
      away: number;
    }
  }

  const searchParams = useSearchParams();
  const matchId = searchParams.get("match_id");
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null)
  const [matchError, setMatchError] = useState<string | null>(null)
  const [insights, setInsights] = useState<string[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [homeLineup, setHomeLineup] = useState<TeamLineup | null>(null);
  const [awayLineup, setAwayLineup] = useState<TeamLineup | null>(null);
  const [lineupsLoading, setLineupsLoading] = useState(false);
  const [lineupsError, setLineupsError] = useState<string | null>(null);

  const getLineups = async (match_id: string) => {
    setHomeLineup(null);
    setAwayLineup(null);
    setLineupsError(null);
    setLineupsLoading(true);
    try {
      const response = await api.get("/matches/lineups", { params: { match_id } });
      setHomeLineup(response.data.home);
      setAwayLineup(response.data.away);
    } catch (error) {
      setLineupsError("Couldn't load lineups for this match.");
      console.error("Error fetching lineups", error);
    } finally {
      setLineupsLoading(false);
    }
  };

  const getInsights = async (match_id: string) => {
    setInsights(null);
    setInsightsError(null);
    setInsightsLoading(true);
    try {
      const response = await api.get("/matches/insights", { params: {match_id} });
      setInsights(response.data.bullets);
    } catch (error) {
      setInsightsError("Couldn't generate insights for this match.");
      console.error("Error fetching insights", error);
    } finally {
      setInsightsLoading(false);
    }
  }

  const getMatchInfo = async (match_id: string) => {
    setMatchError(null);
    try {
      const response = await api.get("/matches/external", { params: {match_id} });
      setMatchInfo(response.data)
      // Fire-and-forget: insights generation can take a minute on first view
      void getInsights(match_id);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setMatchError(`No match found for ID ${match_id}.`);
      } else {
        setMatchError("Something went wrong fetching this match.");
      }
      console.error("Error fetching match", error)
    }
  }

  useEffect(() => {
    if (matchId) {
      void getMatchInfo(matchId)
      void getLineups(matchId)
    }
  }, [matchId]);

  return (
    <div className="min-h-screen bg-[#071014] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-700 bg-slate-950/80 p-6 shadow-[0_0_60px_rgba(15,23,42,0.45)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-wide text-white">
                {matchError
                  ? matchError
                  : matchInfo
                  ? matchInfo["home_team"] + " vs " + matchInfo["away_team"]
                  : "Loading..."}
              </h1>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">Match ID: {matchId ?? "—"}</span>
            </div>
          </div>
        </header>

        <main className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-3xl border border-slate-700 bg-slate-950/90 p-6 shadow-xl shadow-slate-950/20">
              <div className="rounded-3xl border border-slate-700 bg-slate-900/90 p-5">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Game Stats</p>
                <div className="mt-5 space-y-5 text-white">
                  <div className="rounded-3xl bg-slate-950/80 px-4 py-4">
                    <p className="text-sm text-slate-400">Scoreline</p>
                    <div className="mt-3 flex items-center justify-between text-3xl font-semibold text-white">
                      <div className="text-right">
                        <p>{matchInfo ? matchInfo["goals"]["home"] : ""}</p>
                      </div>
                      <span className="text-4xl text-emerald-400">-</span>
                      <div className="text-left">
                        <p>{matchInfo ? matchInfo["goals"]["away"] : ""}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-3xl bg-slate-950/80 px-4 py-4">
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <div className="text-right text-base font-semibold text-white">{matchInfo ? matchInfo["shots_on_goal"]["home"] : ""}</div>
                      <span>Shots on target</span>
                      <div className="text-left text-base font-semibold text-white">{matchInfo ? matchInfo["shots_on_goal"]["away"] : ""}</div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                      <div className="text-right text-base font-semibold text-white">{matchInfo ? matchInfo["shots_total"]["home"] : ""}</div>
                      <span>Total shots</span>
                      <div className="text-left text-base font-semibold text-white">{matchInfo ? matchInfo["shots_total"]["away"]: ""}</div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                      <div className="text-right text-base font-semibold text-white">{matchInfo ? matchInfo["possession"]["home"] + "%" : ""}</div>
                      <span>Possession</span>
                      <div className="text-left text-base font-semibold text-white">{matchInfo ? matchInfo["possession"]["away"] + "%" : ""}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex h-100 flex-col rounded-3xl border border-slate-700 bg-slate-950/90 p-6 shadow-xl shadow-slate-950/20">
              <LineupViewer key={matchId} loading={lineupsLoading} error={lineupsError} home={homeLineup} away={awayLineup} />
            </div>

            <div className="rounded-3xl border border-slate-700 bg-slate-950/90 p-6 shadow-xl shadow-slate-950/20">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Event Details</p>
              <div className="mt-5 space-y-4 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Event</span>
                  <strong>Midnight Showdown</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Date</span>
                  <strong>July 3, 2026</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>League</span>
                  <strong>Pro Circuit</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Venue</span>
                  <strong>Neo Dome</strong>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-700 bg-slate-950/90 p-6 shadow-xl shadow-slate-950/20">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Additional Insights</p>
              <div className="mt-5 space-y-3 text-sm text-slate-400">
                {insightsLoading ? (
                  <p className="animate-pulse">Generating insights… the first view of a match can take a minute.</p>
                ) : insightsError ? (
                  <p>{insightsError}</p>
                ) : insights && insights.length > 0 ? (
                  insights.map((note, index) => (
                    <div key={index} className="rounded-3xl border border-slate-800 bg-slate-900/85 px-4 py-4">
                      {note}
                    </div>
                  ))
                ) : (
                  <p>Look up a match to see what this game meant at the time.</p>
                )}
              </div>
            </div>
        </main>
      </div>
    </div>
  );
}
