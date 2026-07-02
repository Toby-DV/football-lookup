"use client";

import { FormEvent, useEffect, useState } from "react";
import api from "./api";


const MatchList = () => {
  const [matches, setMatches] = useState([]);

  const fetchMatches = async () => {
    try {
      const response = await api.get("/api/matches");
      setMatches(response.data.matches)
    } catch (error){
      console.error("Error fetching matches:", error);
    }
  };

  const addMatch = async () => {
    try {
      const response = await api.post("/matches", { name : "test_match" });
      fetchMatches(); // update match list
    } catch (error) {
      console.error("Error adding match:", error);
    }
  }
  
  useEffect(() => {
    fetchMatches();
  }, []);

  return (
    <div>
      <h2>Match List</h2>
      <ul>
        {matches.map((match, index) => (
          <li key={index}>{match}</li>
        ))}
      </ul>
    </div>
  )
}

export default function Home() {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-zinc-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-zinc-100">
      <main className="w-full max-w-3xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-slate-900 sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight">Todo List</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Add a task and press submit to add it to the list below.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4 sm:flex-row">
          <label className="sr-only" htmlFor="task-input">
            New task
          </label>
          <input
            id="task-input"
            type="text"
            placeholder="Enter a new todo"
            className="min-w-0 flex-1 rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-base outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-zinc-700 dark:bg-slate-950 dark:focus:border-slate-500 dark:focus:ring-slate-700"
          />
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            Submit
          </button>
        </form>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Tasks</h2>
        </section>
      </main>
    </div>
  );
}
