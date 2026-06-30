"use client";

import { FormEvent, useState } from "react";

export default function Home() {
  const [taskText, setTaskText] = useState("");
  const [tasks, setTasks] = useState<string[]>([]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = taskText.trim();
    if (!trimmed) return;

    setTasks((current) => [trimmed, ...current]);
    setTaskText("");
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
            value={taskText}
            onChange={(event) => setTaskText(event.target.value)}
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
          {tasks.length === 0 ? (
            <p className="mt-4 rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-zinc-500 dark:border-zinc-700 dark:bg-slate-950 dark:text-zinc-400">
              No tasks yet. Add one above to get started.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {tasks.map((task, index) => (
                <li
                  key={`${task}-${index}`}
                  className="rounded-3xl border border-zinc-200 bg-zinc-50 px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-slate-950"
                >
                  {task}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
