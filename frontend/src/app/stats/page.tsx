"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import api from "../api";

const MatchList = ({ matches }: { matches: { name: string }[] }) => {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-white">Match List</h2>
      <ul className="space-y-3">
        {matches.length > 0 ? (
          matches.map((match, index) => (
            <li key={index} className="rounded-3xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-slate-200">
              {match.name}
            </li>
          ))
        ) : (
          <p className="text-slate-400">No matches found.</p>
        )}
      </ul>
    </div>
  );
};

const topPerformers = [
  { name: "Razor", role: "Carry", team: "Red Raptors", score: "23 KDA" },
  { name: "Ghost", role: "Support", team: "Blue Titans", score: "18 assists" },
  { name: "Nova", role: "Jungle", team: "Red Raptors", score: "12 objectives" },
];

export default function Stats() {
  return (
    <Suspense fallback={null}>
      <StatsContent />
    </Suspense>
  );
}

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
  const [matches, setMatches] = useState<{ name: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [insights, setInsights] = useState<string[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const fetchMatches = async () => {
    try {
      const response = await api.get("/matches");
      setMatches(response.data.matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
    }
  };

  const addMatch = async (name: string) => {
    try {
      await api.post("/matches", { name });
      fetchMatches();
    } catch (error) {
      console.error("Error adding match:", error);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMatches();
    if (matchId) {
      void getMatchInfo(matchId)
    }
  }, [matchId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inputValue.trim() !== "") {
      await addMatch(inputValue);
      setInputValue("");
    }
  };

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

            <div className="flex flex-col h-100 rounded-3xl border border-slate-700 bg-slate-950/90 p-6 shadow-xl shadow-slate-950/20">
              <div className="flex-1 overflow-y-auto">
                <MatchList matches={matches} />
              </div>
              <form onSubmit={handleSubmit} className="mt-auto grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  className="rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                  type="text"
                  placeholder="Add a new match"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <button
                  type="submit"
                  className="mt-auto rounded-3xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  Submit
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-slate-700 bg-slate-950/90 p-6 shadow-xl shadow-slate-950/20">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Player Spotlight</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Top Performers</h2>
              <div className="mt-6 space-y-4">
                {topPerformers.map((player) => (
                  <div key={player.name} className="flex items-center gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                      <span className="text-sm uppercase">IMG</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{player.name}</p>
                      <p className="text-sm text-slate-400">{player.role} • {player.team}</p>
                    </div>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-emerald-300">{player.score}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-700 bg-slate-950/90 p-6 shadow-xl shadow-slate-950/20">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Team Profiles</p>
              <div className="mt-5 space-y-5">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">Red Raptors</p>
                      <p className="text-sm text-slate-400">Attack-focused roster with strong map control.</p>
                    </div>
                    <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs text-rose-300">Aggressive</span>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Win Rate</span>
                      <strong className="text-white">78%</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Avg. KDA</span>
                      <strong className="text-white">4.6</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Objective Control</span>
                      <strong className="text-white">87%</strong>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">Blue Titans</p>
                      <p className="text-sm text-slate-400">Defensive lineup built for late-game comebacks.</p>
                    </div>
                    <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs text-sky-300">Defensive</span>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Win Rate</span>
                      <strong className="text-white">64%</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Avg. KDA</span>
                      <strong className="text-white">3.9</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Defense Success</span>
                      <strong className="text-white">81%</strong>
                    </div>
                  </div>
                </div>
              </div>
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
