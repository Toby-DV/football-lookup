"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import api from "../api";

// Matches the shape returned by api_client.extract_match_info_summary.
type FixtureSummary = {
  id: number;
  venue_name: string | null;
  league: string | null;
};

export default function Search() {
  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const team1 = searchParams.get("team_1");
  const team2 = searchParams.get("team_2");
  const season = searchParams.get("season");

  const [matches, setMatches] = useState<FixtureSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchMatches = async (t1: string, t2: string, matchSeason: string) => {
    setLoading(true);
    setError(null);
    setMatches(null);
    try {
      const response = await api.get("/matches/search", {
        params: { team_1: t1, team_2: t2, season: matchSeason },
      });
      setMatches(response.data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError(err.response.data?.detail ?? "No matches found for that search.");
      } else {
        setError("Something went wrong searching for this match.");
      }
      console.error("Error searching for match", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (team1 && team2 && season) {
      void searchMatches(team1, team2, season);
    }
  }, [team1, team2, season]);

  return (
    <div className="min-h-screen bg-[#071014] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 rounded-3xl border border-slate-700 bg-slate-950/80 p-6 text-center shadow-[0_0_60px_rgba(15,23,42,0.45)] backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-400/80">SYSTEM ARCHIVE</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-wide text-white">Select a Match</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
            {team1 && team2
              ? `Matches between ${team1} and ${team2}${season ? ` (${season})` : ""}.`
              : "Missing search parameters — go back and search by team and season."}
          </p>
        </header>

        {loading && <p className="animate-pulse text-center text-sm text-slate-400">Searching…</p>}
        {error && <p className="text-center text-sm text-slate-400">{error}</p>}
        {!loading && !error && matches && matches.length === 0 && (
          <p className="text-center text-sm text-slate-400">No matches found for these teams.</p>
        )}

        <div className="flex flex-col gap-4">
          {matches?.map((match) => (
            <button
              key={match.id}
              type="button"
              onClick={() => router.push(`/stats?match_id=${match.id}`)}
              className="flex items-center justify-between gap-4 rounded-3xl border border-slate-700 bg-slate-950/90 p-5 text-left shadow-xl shadow-slate-950/20 transition hover:border-emerald-400"
            >
              <div className="text-sm font-medium text-white">
                {team1} vs {team2}
              </div>
              <div className="shrink-0 text-right text-xs text-slate-400">
                <p>{match.league ?? "Unknown league"}</p>
                <p className="mt-1">{match.venue_name ?? "Unknown venue"}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm text-slate-400 underline-offset-4 hover:text-emerald-300 hover:underline"
          >
            ‹ Back to search
          </button>
        </div>
      </div>
    </div>
  );
}
