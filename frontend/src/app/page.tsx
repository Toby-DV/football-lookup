"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [matchId, setMatchId] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = matchId.trim();
    if (trimmed !== "") {
      router.push(`/stats?match_id=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-[#071014] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-950/80 p-10 text-center shadow-[0_0_60px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.35em] text-emerald-400/80">SYSTEM ARCHIVE</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-wide text-white">Esports Match Lookup</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-slate-400">
          Search for a match by ID to pull its scoreline, venue, and team profiles from the archive.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className="rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
            type="text"
            inputMode="numeric"
            placeholder="Enter match ID"
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-3xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Search
          </button>
        </form>
      </div>
    </div>
  );
}

