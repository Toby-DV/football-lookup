"use client";

import { FormEvent, useEffect, useState } from "react";
import api from "./api";


const MatchList = ({matches} : {matches: {name: string}[]}) => {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Match List</h2>
        <ul className="list-disc pl-5">
          {matches.length > 0 ? (
            matches.map((match, index) => (
              <li key={index} className="py-1">
                {match["name"]}
              </li>
            ))
          ) : (
            <p className="text-zinc-500">No matches found.</p>
          )}
        </ul>
    </div>
  )
}

export default function Home() {
  const [matches, setMatches] = useState([]);
  const [inputValue, setInputValue] = useState("");

  const fetchMatches = async () => {
  try {
    const response = await api.get("/matches");
    setMatches(response.data.matches)
  } catch (error){
    console.error("Error fetching matches:", error);
  }
};

  const addMatch = async (name: string) => {
    try {
      await api.post("/matches", { name : name });
      fetchMatches(); // update match list
    } catch (error) {
      console.error("Error adding match:", error);
    }
  }

  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  fetchMatches();
}, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    console.log("Form submitted with value:", inputValue);
    event.preventDefault();
    if (inputValue.trim() !== "") {
      console.log("Submitting match:", inputValue);
      await addMatch(inputValue);
      setInputValue("");
    }
  };
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-zinc-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-zinc-100">
      <main className="w-full max-w-3xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-slate-900 sm:p-10">
        <MatchList matches={matches} />
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4 sm:flex-row">
          <input
            className="min-w-0 flex-1 rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-base outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-zinc-700 dark:bg-slate-950 dark:focus:border-slate-500 dark:focus:ring-slate-700"
            id="task-input"
            type="text"
            placeholder="Enter a new todo"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            Submit
          </button>
        </form>
      </main>
    </div>
  );
}