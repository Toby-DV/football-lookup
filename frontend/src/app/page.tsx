"use client";

import { FormEvent, useEffect, useState } from "react";
import api from "./api";

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

const insights = [
  "Red Raptors controlled vision across the map for 72% of the match.",
  "Blue Titans responded with a strong late-game rotation after losing point control.",
  "Momentum shifted after the 3rd minute teamfight, giving Red Raptors sustained pressure.",
];

export default function Home() {
  const [matches, setMatches] = useState<{ name: string }[]>([]);
  const [inputValue, setInputValue] = useState("");

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

  useEffect(() => {
    void fetchMatches();
  }, []);

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
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-400/80">SYSTEM ARCHIVE</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-wide text-white">Esports Match Dashboard</h1>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">SYSTEM STATUS: STABLE</span>
              <span className="text-xs text-slate-400">Last update: 2m ago</span>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-slate-400">
            Live esports match overview with scoreline, team profiles, match list, and player breakdown.
          </p>
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
                        <p>2</p>
                        <p className="text-sm font-normal text-slate-400">Red Raptors</p>
                      </div>
                      <span className="text-4xl text-emerald-400">-</span>
                      <div className="text-left">
                        <p>1</p>
                        <p className="text-sm font-normal text-slate-400">Blue Titans</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-3xl bg-slate-950/80 px-4 py-4">
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <span>Control Time</span>
                      <strong className="text-white">72%</strong>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                      <span>Objectives</span>
                      <strong className="text-white">7</strong>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                      <span>Gold Lead</span>
                      <strong className="text-white">+4.2k</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col rounded-3xl border border-slate-700 bg-slate-950/90 p-6 shadow-xl shadow-slate-950/20">
                <MatchList matches={matches} />
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
                {insights.map((note, index) => (
                  <div key={index} className="rounded-3xl border border-slate-800 bg-slate-900/85 px-4 py-4">
                    {note}
                  </div>
                ))}
              </div>
            </div>
        </main>
      </div>
    </div>
  );
}
