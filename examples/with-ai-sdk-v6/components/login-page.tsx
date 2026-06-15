"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const [role, setRole] = useState<"student" | "teacher" | null>(null);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { loginAsStudent, loginAsTeacher } = useAuth();

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const success = await loginAsStudent(id.toUpperCase());
    if (!success) setError("Identifiant incorrect.");
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const success = await loginAsTeacher(password);
    if (!success) setError("Mot de passe incorrect.");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 font-sans text-zinc-100">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 text-4xl shadow-lg shadow-blue-500/20">
            🎓
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase">
            PROJET DRAM
          </h1>
          <p className="mt-2 font-medium tracking-wide text-zinc-500">
            Assistant pédagogique intelligent
          </p>
        </div>

        {!role ? (
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => setRole("student")}
              className="group rounded-2xl border border-zinc-700 bg-zinc-800 p-6 text-left transition-all duration-300 hover:border-blue-400 hover:bg-blue-600"
            >
              <span className="mb-2 block text-2xl">👦👧</span>
              <span className="block text-lg font-bold tracking-tight uppercase group-hover:text-white">
                Je suis un élève
              </span>
              <span className="mt-1 block text-sm text-zinc-500 group-hover:text-blue-100">
                Accéder à mes exercices
              </span>
            </button>

            <button
              onClick={() => setRole("teacher")}
              className="group rounded-2xl border border-zinc-700 bg-zinc-800 p-6 text-left transition-all duration-300 hover:border-emerald-400 hover:bg-emerald-600"
            >
              <span className="mb-2 block text-2xl">👨‍🏫👩‍🏫</span>
              <span className="block text-lg font-bold tracking-tight uppercase group-hover:text-white">
                Je suis un professeur
              </span>
              <span className="mt-1 block text-sm text-zinc-500 group-hover:text-emerald-100">
                Gérer la classe et les sessions
              </span>
            </button>
          </div>
        ) : (
          <div>
            <button
              onClick={() => {
                setRole(null);
                setError("");
              }}
              className="mb-6 flex items-center gap-2 text-sm font-bold tracking-widest text-zinc-500 uppercase hover:text-zinc-300"
            >
              ← Retour
            </button>

            {role === "student" ? (
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div>
                  <label className="mb-2 ml-1 block text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase">
                    Identifiant Élève
                  </label>
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="Ex: AB12CD"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center font-mono text-xl tracking-widest uppercase transition-all outline-none focus:border-blue-500"
                    required
                  />
                </div>
                {error && (
                  <p className="text-center text-xs font-bold text-red-500">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 py-4 font-black tracking-widest text-white uppercase shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500"
                >
                  Se connecter
                </button>
              </form>
            ) : (
              <form onSubmit={handleTeacherLogin} className="space-y-4">
                <div>
                  <label className="mb-2 ml-1 block text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-200 transition-all outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                {error && (
                  <p className="text-center text-xs font-bold text-red-500">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-600 py-4 font-black tracking-widest text-white uppercase shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500"
                >
                  Accès Dashboard
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <p className="mt-8 text-[10px] font-bold tracking-[0.3em] text-zinc-600 uppercase">
        DRAM PROJECT © 2026 - Accessibilité FALC
      </p>
    </div>
  );
}
