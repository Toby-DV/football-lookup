"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const YEAR_PATTERN = /\b(19|20)\d{2}\b/;
const TEAM_SEPARATOR = /\s+vs\s+/i;

// Parses "Team A vs Team B 2023" (year can sit anywhere in the string).
// Returns null if the input doesn't match that shape.
function parseSearchInput(input: string): { team1: string; team2: string; season: string } | null {
  const yearMatch = input.match(YEAR_PATTERN);
  if (!yearMatch) return null;

  const season = yearMatch[0];
  const withoutYear = input.replace(YEAR_PATTERN, "").trim();

  const teams = withoutYear.split(TEAM_SEPARATOR);
  if (teams.length !== 2) return null;

  const [team1, team2] = teams.map((team) => team.trim());
  if (!team1 || !team2) return null;

  return { team1, team2, season };
}

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseSearchInput(query);
    if (!parsed) {
      setError('Error - Example input: "Chelsea vs Arsenal 2023".');
      return;
    }
    setError(null);
    const params = new URLSearchParams({
      team_1: parsed.team1,
      team_2: parsed.team2,
      season: parsed.season,
    });
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-[#071014] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-950/80 p-10 text-center shadow-[0_0_60px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.35em] text-emerald-400/80">SYSTEM ARCHIVE</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-wide text-white">Football Match Lookup</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-slate-400">
          Search for a match by team names and year to pull its scoreline, venue, and team profiles from the archive.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className="rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
            type="text"
            placeholder="Team A vs Team B 2023"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-3xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Search
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-slate-400">{error}</p>}
      </div>
    </div>
  );
}

