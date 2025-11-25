"use client";

import { useEffect, useMemo, useReducer, useState } from "react";

type Filter = "all" | "active" | "completed";

type Todo = {
  id: string;
  title: string;
  notes: string;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
};

type Action =
  | { type: "hydrate"; payload: Todo[] }
  | { type: "add"; payload: Todo }
  | { type: "toggle"; payload: { id: string } }
  | { type: "remove"; payload: { id: string } }
  | { type: "update"; payload: { id: string; data: Partial<Todo> } }
  | { type: "clearCompleted" };

const STORAGE_KEY = "momentum-tasks";

function todoReducer(state: Todo[], action: Action): Todo[] {
  switch (action.type) {
    case "hydrate":
      return action.payload;
    case "add":
      return [action.payload, ...state];
    case "toggle":
      return state.map((todo) =>
        todo.id === action.payload.id
          ? { ...todo, completed: !todo.completed }
          : todo,
      );
    case "remove":
      return state.filter((todo) => todo.id !== action.payload.id);
    case "update":
      return state.map((todo) =>
        todo.id === action.payload.id
          ? { ...todo, ...action.payload.data }
          : todo,
      );
    case "clearCompleted":
      return state.filter((todo) => !todo.completed);
    default:
      return state;
  }
}

function useTodos() {
  const [state, dispatch] = useReducer(todoReducer, []);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Todo[] = JSON.parse(stored);
        dispatch({ type: "hydrate", payload: parsed });
      }
    } catch (error) {
      console.error("Failed to load stored todos", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const addTodo = (input: { title: string; notes: string; dueDate?: string }) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    dispatch({
      type: "add",
      payload: {
        id,
        title: input.title.trim(),
        notes: input.notes.trim(),
        dueDate: input.dueDate || undefined,
        completed: false,
        createdAt: new Date().toISOString(),
      },
    });
  };

  const toggleTodo = (id: string) => dispatch({ type: "toggle", payload: { id } });
  const removeTodo = (id: string) => dispatch({ type: "remove", payload: { id } });
  const updateTodo = (id: string, data: Partial<Todo>) =>
    dispatch({ type: "update", payload: { id, data } });
  const clearCompleted = () => dispatch({ type: "clearCompleted" });

  return {
    todos: state,
    addTodo,
    toggleTodo,
    removeTodo,
    updateTodo,
    clearCompleted,
    hydrated,
  };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Home() {
  const { todos, addTodo, toggleTodo, removeTodo, updateTodo, clearCompleted, hydrated } =
    useTodos();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState<string>();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDueDate, setEditDueDate] = useState<string | undefined>();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    addTodo({ title, notes, dueDate });
    setTitle("");
    setNotes("");
    setDueDate(undefined);
  };

  const filteredTodos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return todos.filter((todo) => {
      if (filter === "active" && todo.completed) return false;
      if (filter === "completed" && !todo.completed) return false;
      if (!normalizedQuery) return true;
      const haystack = `${todo.title} ${todo.notes}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [todos, filter, query]);

  const remainingCount = useMemo(
    () => todos.filter((todo) => !todo.completed).length,
    [todos],
  );

  const beginEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditNotes(todo.notes);
    setEditDueDate(todo.dueDate);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditNotes("");
    setEditDueDate(undefined);
  };

  const saveEdit = (id: string) => {
    if (!editTitle.trim()) return;
    updateTodo(id, {
      title: editTitle.trim(),
      notes: editNotes.trim(),
      dueDate: editDueDate || undefined,
    });
    cancelEdit();
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-8 lg:px-10">
        <header className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
              Momentum Tasks
            </p>
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Stay focused. Finish more.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Capture your tasks, prioritize what matters, and keep momentum with a
              focused tasks dashboard that lives in your browser.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 shadow-lg shadow-slate-950/40 backdrop-blur">
            <p className="font-semibold">{remainingCount} task(s)</p>
            <p className="text-xs text-slate-400">awaiting completion</p>
          </div>
        </header>

        <section className="mb-10 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-slate-950/30 backdrop-blur">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Task
                </label>
                <input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="What needs your focus?"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                  autoComplete="off"
                />
              </div>
              <div className="w-full sm:w-44">
                <label
                  htmlFor="due"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Due
                </label>
                <input
                  id="due"
                  type="date"
                  value={dueDate ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDueDate(value || undefined);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Notes <span className="text-xs text-slate-500">(optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add context, steps, or links to help you finish faster."
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {(["all", "active", "completed"] as Filter[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFilter(option)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      filter === option
                        ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/40"
                        : "bg-white/10 text-slate-200 hover:bg-white/20"
                    }`}
                  >
                    {option === "all"
                      ? "All"
                      : option === "active"
                      ? "Active"
                      : "Completed"}
                  </button>
                ))}
              </div>
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search your tasks…"
                  className="w-full rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 sm:w-64"
                />
                <button
                  type="button"
                  onClick={clearCompleted}
                  className="rounded-full px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-rose-500/20 hover:text-rose-200"
                >
                  Clear completed
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Add task
            </button>
          </form>
        </section>

        <section className="space-y-4">
          {!hydrated && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
              Loading your tasks…
            </div>
          )}
          {hydrated && filteredTodos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/50 px-6 py-12 text-center text-sm text-slate-400">
              <p className="font-medium text-slate-200">No tasks here yet.</p>
              <p>Add something you want to accomplish today.</p>
            </div>
          ) : (
            filteredTodos.map((todo) => {
              const isEditing = editingId === todo.id;
              return (
                <article
                  key={todo.id}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-950/80 to-slate-900/80 p-5 shadow-xl shadow-slate-950/40 transition focus-within:border-indigo-400 focus-within:shadow-indigo-500/20"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                    <button
                      type="button"
                      onClick={() => toggleTodo(todo.id)}
                      className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm transition ${
                        todo.completed
                          ? "border-indigo-500 bg-indigo-500 text-white shadow-indigo-500/40"
                          : "border-white/20 text-white hover:border-indigo-400 hover:text-indigo-200"
                      }`}
                      aria-label={
                        todo.completed ? "Mark as incomplete" : "Mark as complete"
                      }
                    >
                      {todo.completed ? "✓" : ""}
                    </button>
                    <div className="flex-1 space-y-2">
                      {isEditing ? (
                        <div className="space-y-3">
                          <input
                            value={editTitle}
                            onChange={(event) => setEditTitle(event.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                          />
                          <textarea
                            value={editNotes}
                            onChange={(event) => setEditNotes(event.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                          />
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <label className="flex items-center gap-2 text-xs text-slate-400">
                              Due date
                              <input
                                type="date"
                                value={editDueDate ?? ""}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setEditDueDate(value || undefined);
                                }}
                                className="rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1 text-xs text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/60"
                              />
                            </label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => saveEdit(todo.id)}
                                className="rounded-full bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-indigo-500/40 transition hover:bg-indigo-400"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="rounded-full px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-3">
                            <h2
                              className={`text-lg font-semibold ${
                                todo.completed
                                  ? "text-slate-400 line-through"
                                  : "text-white"
                              }`}
                            >
                              {todo.title}
                            </h2>
                            {todo.dueDate && (
                              <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200">
                                Due {formatDate(todo.dueDate)}
                              </span>
                            )}
                          </div>
                          {todo.notes && (
                            <p
                              className={`text-sm leading-relaxed ${
                                todo.completed
                                  ? "text-slate-500 line-through"
                                  : "text-slate-300"
                              }`}
                            >
                              {todo.notes}
                            </p>
                          )}
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            Added {formatDate(todo.createdAt)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {!isEditing && (
                    <div className="mt-4 flex gap-3 text-xs text-slate-400 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => beginEdit(todo)}
                        className="rounded-full border border-white/10 px-4 py-2 font-semibold uppercase tracking-[0.2em] transition hover:border-indigo-400 hover:text-indigo-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTodo(todo.id)}
                        className="rounded-full border border-white/10 px-4 py-2 font-semibold uppercase tracking-[0.2em] transition hover:border-rose-500/70 hover:text-rose-200"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
