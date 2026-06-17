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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-4 font-sans text-zinc-900">
      <div className="w-full max-w-md rounded-3xl border border-white/50 bg-white/80 p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-emerald-500 text-4xl shadow-lg shadow-blue-500/20">
            🎓
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-zinc-950 uppercase">
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
              className="group rounded-2xl border border-blue-100 bg-white p-6 text-left transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100"
            >
              <span className="mb-2 block text-2xl">👦👧</span>
              <span className="block text-lg font-bold tracking-tight uppercase group-hover:text-blue-900">
                Je suis un élève
              </span>
              <span className="mt-1 block text-sm text-zinc-500 group-hover:text-blue-700">
                Accéder à mes exercices
              </span>
            </button>

            <button
              onClick={() => setRole("teacher")}
              className="group rounded-2xl border border-emerald-100 bg-white p-6 text-left transition-all duration-300 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100"
            >
              <span className="mb-2 block text-2xl">👨‍🏫👩‍🏫</span>
              <span className="block text-lg font-bold tracking-tight uppercase group-hover:text-emerald-900">
                Je suis un professeur
              </span>
              <span className="mt-1 block text-sm text-zinc-500 group-hover:text-emerald-700">
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
              className="mb-6 flex items-center gap-2 text-sm font-bold tracking-widest text-zinc-400 uppercase hover:text-zinc-600"
            >
              ← Retour
            </button>

            {role === "student" ? (
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div>
                  <label className="mb-2 ml-1 block text-[10px] font-black tracking-[0.2em] text-zinc-400 uppercase">
                    Identifiant Élève
                  </label>
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="Ex: AB12CD"
                    className="w-full rounded-xl border border-zinc-100 bg-white p-4 text-center font-mono text-xl tracking-widest uppercase transition-all outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-4 font-black tracking-widest text-white uppercase shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] hover:shadow-blue-500/40"
                >
                  Se connecter
                </button>
              </form>
            ) : (
              <form onSubmit={handleTeacherLogin} className="space-y-4">
                <div>
                  <label className="mb-2 ml-1 block text-[10px] font-black tracking-[0.2em] text-zinc-400 uppercase">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-zinc-100 bg-white p-4 text-zinc-900 transition-all outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
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
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-4 font-black tracking-widest text-white uppercase shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.02] hover:shadow-emerald-500/40"
                >
                  Accès Dashboard
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <p className="mt-8 text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">
        DRAM PROJECT © 2026 - Accessibilité FALC
      </p>
    </div>
  );
}
