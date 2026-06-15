"use client";

import { useEffect, useState } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  useThread,
} from "@assistant-ui/react";
import { useAuth } from "@/lib/auth-context";

// helper: extract plain text from a ThreadMessage or raw MongoDB message
function extractText(msg: any): string {
  if (!msg?.content) return "";
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text ?? "")
      .join("");
  }
  return "";
}

function printPDF(
  messages: any[],
  meta: { title: string; topic?: string; level?: string; studentName?: string },
) {
  const filtered = messages.filter(
    (m: any) => m.role === "user" || m.role === "assistant",
  );
  if (filtered.length === 0) {
    alert("Aucun message à exporter.");
    return;
  }
  const pw = window.open("", "_blank");
  if (!pw) {
    alert("Veuillez autoriser les popups pour imprimer.");
    return;
  }
  const dateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const html = filtered
    .map((m: any) => {
      const role = m.role === "user" ? "Élève" : "Assistant (IA)";
      const cls = m.role === "user" ? "user-msg" : "assistant-msg";
      const text = extractText(m).replace(/\n/g, "<br/>");
      return `<div class="message ${cls}"><div class="role">${role}</div><div class="body">${text}</div></div>`;
    })
    .join("");
  pw.document.write(`<!DOCTYPE html><html><head><title>${meta.title}</title>
  <style>
    body{font-family:Arial,sans-serif;margin:40px;color:#333;line-height:1.6}
    h1{font-size:20px;text-transform:uppercase;margin:0}
    .info{font-size:13px;color:#666;margin:8px 0 30px}
    .message{margin-bottom:18px;padding:14px;border-radius:6px;page-break-inside:avoid}
    .user-msg{background:#f0f7ff;border-left:5px solid #0066cc}
    .assistant-msg{background:#f9f9f9;border-left:5px solid #555}
    .role{font-size:11px;font-weight:bold;text-transform:uppercase;color:#888;margin-bottom:4px}
    .body{font-size:15px;white-space:pre-wrap}
    .no-print{text-align:center;margin-top:30px}
    @media print{.no-print{display:none}}
  </style></head><body>
  <h1>${meta.title}</h1>
  <div class="info">
    Date : ${dateStr}<br/>
    Élève : ${meta.studentName ?? ""}<br/>
    Session : ${meta.topic ?? "Discussion libre"}<br/>
    Niveau : ${meta.level ?? "—"}
  </div>
  ${html}
  <div class="no-print">
    <button onclick="window.print()" style="padding:10px 24px;font-size:15px;cursor:pointer">
      🖨️ Imprimer / Sauvegarder en PDF
    </button>
  </div>
  <script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
  </body></html>`);
  pw.document.close();
}

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<
    "monitor" | "students" | "sessions"
  >("monitor");
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { user, logout } = useAuth();

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [threadsRes, studentsRes, sessionsRes] = await Promise.all([
        fetch("/api/threads?t=" + Date.now()),
        fetch("/api/students?t=" + Date.now()),
        fetch("/api/sessions?t=" + Date.now()),
      ]);
      const [threadsData, studentsData, sessionsData] = await Promise.all([
        threadsRes.json(),
        studentsRes.json(),
        sessionsRes.json(),
      ]);
      setThreads(threadsData);
      setStudents(studentsData);
      setSessions(sessionsData);

      // Mettre à jour selectedThread si en cours de visualisation ou sélectionner le premier par défaut si non défini
      setSelectedThread((current: any) => {
        if (!current) {
          return threadsData.length > 0 ? threadsData[0] : null;
        }
        const updated = threadsData.find((t: any) => t._id === current._id);
        return updated || current;
      });
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Polling toutes les 5 secondes
    const interval = setInterval(() => {
      fetchData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return (
      <div className="p-20 text-center font-bold text-zinc-500">
        Chargement...
      </div>
    );

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 font-sans text-white">
      {/* Sidebar Gauche */}
      <aside className="flex w-20 flex-col items-center gap-8 border-r border-zinc-800 bg-zinc-900 py-8 shadow-2xl">
        <div className="text-3xl">🛡️</div>

        <nav className="flex flex-col gap-6">
          <NavButton
            active={activeTab === "monitor"}
            onClick={() => setActiveTab("monitor")}
            icon="📺"
            label="Suivi"
          />
          <NavButton
            active={activeTab === "students"}
            onClick={() => setActiveTab("students")}
            icon="👥"
            label="Élèves"
          />
          <NavButton
            active={activeTab === "sessions"}
            onClick={() => setActiveTab("sessions")}
            icon="📅"
            label="Sessions"
          />
        </nav>

        <button
          onClick={logout}
          className="mt-auto text-zinc-600 transition hover:text-white"
        >
          🚪
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-8 backdrop-blur-md">
          <h1 className="text-xl font-black tracking-widest text-blue-400 uppercase">
            {activeTab === "monitor"
              ? "Monitorage en direct"
              : activeTab === "students"
                ? "Gestion des élèves"
                : "Sessions Pédagogiques"}
          </h1>
          <div className="text-xs font-bold tracking-widest text-zinc-500 uppercase">
            Enseignant : {user?.name}
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {activeTab === "monitor" && (
            <div className="flex h-full">
              <aside className="flex w-80 flex-col gap-2 overflow-y-auto border-r border-zinc-800 p-4">
                {threads.map((t) => (
                  <div
                    key={t._id}
                    onClick={() => setSelectedThread(t)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${selectedThread?._id === t._id ? "border-blue-400 bg-blue-600" : "border-zinc-800 bg-zinc-900 hover:bg-zinc-800"}`}
                  >
                    <div className="font-bold tracking-tight uppercase">
                      {t.studentName}
                    </div>
                    <div className="mt-1 text-[10px] font-bold text-zinc-400">
                      {t.topic || "Discussion"}
                    </div>
                  </div>
                ))}
              </aside>
              <main className="relative flex-1">
                {selectedThread ? (
                  <ThreadViewer
                    key={selectedThread._id}
                    thread={selectedThread}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-bold tracking-widest text-zinc-600 uppercase">
                    Sélectionnez une discussion
                  </div>
                )}
              </main>
            </div>
          )}

          {activeTab === "students" && (
            <StudentManager
              students={students}
              sessions={sessions}
              refresh={fetchData}
            />
          )}

          {activeTab === "sessions" && (
            <SessionManager sessions={sessions} refresh={fetchData} />
          )}
        </div>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${active ? "scale-110 text-blue-500" : "text-zinc-500 hover:text-zinc-300"}`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-[10px] font-black tracking-tighter uppercase">
        {label}
      </span>
    </button>
  );
}

function StudentManager({ students, sessions, refresh }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    frenchLevel: "A1",
    mathLevel: "6ème",
  });

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/students", {
      method: "POST",
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      setShowAdd(false);
      setFormData({
        firstName: "",
        lastName: "",
        frenchLevel: "A1",
        mathLevel: "6ème",
      });
      refresh();
    }
  };

  const updateStudent = async (id: string, data: any) => {
    await fetch(`/api/students/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    refresh();
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-3xl font-black tracking-tighter uppercase">
          Annuaire des élèves
        </h2>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold tracking-widest uppercase transition-all hover:bg-blue-500"
        >
          + Ajouter un élève
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {students.map((s: any) => (
          <div
            key={s._id}
            className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
          >
            <div className="absolute top-0 right-0 p-4 font-mono text-sm font-bold text-blue-500 opacity-30">
              ID: {s.studentId}
            </div>
            <h3 className="mb-4 text-xl font-black uppercase">
              {s.firstName} {s.lastName}
            </h3>

            <div className="mb-6 flex gap-2">
              <LevelBadge label="FR" value={s.frenchLevel} />
              <LevelBadge label="MA" value={s.mathLevel} />
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-[10px] font-black text-zinc-500 uppercase">
                  Niveau Français
                </label>
                <select
                  value={s.frenchLevel}
                  onChange={(e) =>
                    updateStudent(s._id, { frenchLevel: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm outline-none"
                >
                  <option value="A1">Niveau A1</option>
                  <option value="A2">Niveau A2</option>
                  <option value="B1">Niveau B1</option>
                  <option value="B2">Niveau B2</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black text-zinc-500 uppercase">
                  Assigner Session
                </label>
                <select
                  value={s.currentSessionId || ""}
                  onChange={(e) =>
                    updateStudent(s._id, {
                      currentSessionId: e.target.value || null,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm outline-none"
                >
                  <option value="">Aucune session</option>
                  {sessions.map((sess: any) => (
                    <option key={sess._id} value={sess._id}>
                      {sess.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={async () => {
                if (confirm("Supprimer ?")) {
                  await fetch(`/api/students/${s._id}`, { method: "DELETE" });
                  refresh();
                }
              }}
              className="mt-6 text-xs font-bold text-red-500 uppercase opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
            >
              Supprimer le profil
            </button>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
            <h3 className="mb-6 text-2xl font-black uppercase">Nouvel Élève</h3>
            <form onSubmit={addStudent} className="space-y-4">
              <input
                placeholder="Prénom"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
              />
              <input
                placeholder="Nom"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 py-4 font-black tracking-widest uppercase"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="w-full py-2 font-bold text-zinc-500"
              >
                Annuler
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionManager({ sessions, refresh }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    objective: "",
    subject: "Mathématiques",
  });

  const addSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/sessions", {
      method: "POST",
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      setShowAdd(false);
      setFormData({ title: "", objective: "", subject: "Mathématiques" });
      refresh();
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-3xl font-black tracking-tighter uppercase">
          Catalogue des Sessions
        </h2>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold tracking-widest uppercase transition-all hover:bg-emerald-500"
        >
          + Créer une session
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {sessions.map((s: any) => (
          <div
            key={s._id}
            className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between">
              <span className="rounded-full border border-emerald-900/30 bg-zinc-800 px-3 py-1 text-[10px] font-black text-emerald-400 uppercase">
                {s.subject}
              </span>
              <button
                onClick={async () => {
                  await fetch(`/api/sessions/${s._id}`, { method: "DELETE" });
                  refresh();
                }}
                className="text-zinc-600 transition hover:text-red-500"
              >
                🗑️
              </button>
            </div>
            <h3 className="mb-2 text-2xl font-black tracking-tight uppercase">
              {s.title}
            </h3>
            <p className="mb-4 text-sm leading-relaxed text-zinc-400">
              {s.objective}
            </p>
            <div className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase">
              Créé le {new Date(s.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
            <h3 className="mb-6 text-2xl font-black uppercase">
              Nouvelle Session
            </h3>
            <form onSubmit={addSession} className="space-y-4">
              <input
                placeholder="Titre de la session (ex: Les Fractions)"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
              <textarea
                placeholder="Objectif pédagogique pour l'IA (ex: Guide l'élève à travers la multiplication des fractions...)"
                className="h-32 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                value={formData.objective}
                onChange={(e) =>
                  setFormData({ ...formData, objective: e.target.value })
                }
                required
              />
              <select
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
              >
                <option value="Mathématiques">Mathématiques</option>
                <option value="Français">Français</option>
                <option value="Sciences">Sciences</option>
              </select>
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-600 py-4 font-black tracking-widest uppercase"
              >
                Lancer la session
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="w-full py-2 font-bold text-zinc-500"
              >
                Annuler
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function LevelBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1">
      <span className="text-[10px] font-black text-zinc-500">{label}:</span>
      <span className="text-xs font-bold text-blue-400">{value}</span>
    </div>
  );
}

// Inner component for ThreadViewer – must be INSIDE AssistantRuntimeProvider
function ThreadViewerInner({ thread }: { thread: any }) {
  // useThread runs inside AssistantRuntimeProvider — correct context
  const liveMessages = useThread((t) => t.messages);

  const handlePrint = () => {
    printPDF(liveMessages as any[], {
      title: `Rapport - ${thread.studentName || ""}`,
      studentName: thread.studentName,
      topic: thread.topic,
      level: thread.languageLevel ?? "A1",
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/40 p-4">
        <div className="text-sm font-bold text-zinc-400">
          Discussion de {thread.studentName}
          <span className="ml-2 text-xs text-zinc-600">
            ({liveMessages.length} message{liveMessages.length !== 1 ? "s" : ""}
            )
          </span>
        </div>
        <button
          onClick={handlePrint}
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold tracking-wider text-white uppercase transition-all hover:bg-blue-500"
        >
          📄 Imprimer / PDF
        </button>
      </div>
      <div className="relative flex-1">
        <Thread />
      </div>
    </div>
  );
}

function ThreadViewer({ thread }: { thread: any }) {
  // convertMessage: maps raw MongoDB message → ThreadMessageLike
  const convertMessage = (m: any, idx: number) => ({
    id: m._id?.toString() ?? `msg-${idx}`,
    role: m.role as "user" | "assistant",
    content: [
      {
        type: "text" as const,
        text: Array.isArray(m.content)
          ? m.content.map((p: any) => p.text ?? "").join("")
          : typeof m.content === "string"
            ? m.content
            : "",
      },
    ],
  });

  const runtime = useExternalStoreRuntime({
    messages: thread?.messages ?? [],
    convertMessage,
    onNew: async () => {
      // read-only view
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadViewerInner thread={thread} />
    </AssistantRuntimeProvider>
  );
}
