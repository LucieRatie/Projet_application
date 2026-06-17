"use client";

import { useEffect, useState } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  useThread,
} from "@assistant-ui/react";
import { useAuth } from "@/lib/auth-context";
import {
  Monitor,
  Users,
  CalendarDays,
  LogOut,
  ShieldCheck,
} from "lucide-react";

// ... rest of the file ...
// In NavButton/Sidebar, update the icons:
// <ShieldCheck size={28} />
// <Monitor size={28} />
// <Users size={28} />
// <CalendarDays size={28} />
// <LogOut size={28} />

const MATH_LEVELS = ["<6ème", "6ème", "5ème", "4ème", "3ème", ">3ème"];

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
  meta: {
    title: string;
    topic?: string;
    level?: string;
    mathLevel?: string;
    studentName?: string;
  },
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
    Niveau : ${meta.level ?? "—"} ${meta.mathLevel ? `| MATH : ${meta.mathLevel}` : ""}
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

function printStudentList(students: any[]) {
  if (!students || students.length === 0) {
    alert("Aucun élève à exporter.");
    return;
  }

  const levels = ["<6ème", "6ème", "5ème", "4ème", "3ème", ">3ème"];

  // Sắp xếp học sinh theo trình độ (mathLevel)
  const sorted = [...students].sort((a, b) => {
    const levelOrder =
      levels.indexOf(a.mathLevel) - levels.indexOf(b.mathLevel);
    if (levelOrder !== 0) return levelOrder;
    return (a.lastName || "").localeCompare(b.lastName || "");
  });

  const dateStr = new Date().toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const rows = sorted
    .map(
      (s, idx) => `
    <tr>
      <td style="border:1px solid #ddd;padding:10px;text-align:center">${idx + 1}</td>
      <td style="border:1px solid #ddd;padding:10px"><b>${(s.lastName || "").toUpperCase()}</b> ${s.firstName || ""}</td>
      <td style="border:1px solid #ddd;padding:10px;text-align:center">${s.mathLevel || "<6ème"}</td>
      <td style="border:1px solid #ddd;padding:10px;font-family:monospace;text-align:center">${s.studentId || ""}</td>
    </tr>
  `,
    )
    .join("");

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Annuaire des Élèves</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; }
        h1 { font-size: 24px; text-transform: uppercase; margin-bottom: 5px; color: #000; }
        .info { font-size: 14px; color: #666; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #f4f4f4; border: 1px solid #ddd; padding: 12px; text-align: left; text-transform: uppercase; font-size: 11px; font-weight: bold; }
        td { border: 1px solid #ddd; padding: 10px; font-size: 13px; }
        .no-print { text-align: center; margin-top: 40px; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <h1>Annuaire des Élèves</h1>
      <div class="info">Date d'exportation : ${dateStr}</div>
      <table>
        <thead>
          <tr>
            <th style="width:40px;text-align:center">N°</th>
            <th>Nom et Prénom</th>
            <th style="width:100px;text-align:center">Classe</th>
            <th style="width:150px;text-align:center">ID Étudiant</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div class="no-print">
        <button onclick="window.print()" style="padding:12px 30px;font-size:16px;cursor:pointer;background:#0066cc;color:white;border:none;border-radius:6px;font-weight:bold;">
          🖨️ Imprimer la liste / PDF
        </button>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([content], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");

  if (!win) {
    alert("Veuillez autoriser các cửa sổ bật lên (popups) để xem danh sách.");
  }
}

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<
    "monitor" | "students" | "sessions"
  >("monitor");
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [monitorSessionFilter, setMonitorSessionFilter] = useState("all");
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

      if (Array.isArray(threadsData)) setThreads(threadsData);
      if (Array.isArray(studentsData)) setStudents(studentsData);
      if (Array.isArray(sessionsData)) setSessions(sessionsData);

      // Mettre à jour selectedThread si en cours de visualisation ou sélectionner le premier par défaut si non défini
      setSelectedThread((current: any) => {
        if (!current && Array.isArray(threadsData) && threadsData.length > 0) {
          return threadsData[0];
        }
        if (Array.isArray(threadsData)) {
          const updated = threadsData.find((t: any) => t._id === current?._id);
          return updated || current;
        }
        return current;
      });
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Polling toutes les 3 secondes
    const interval = setInterval(() => {
      fetchData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const updateStudent = async (id: string, data: any) => {
    console.log("Updating student:", id, data);
    await fetch(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchData(true);
  };

  if (loading)
    return (
      <div className="p-20 text-center font-bold text-zinc-500">
        Chargement...
      </div>
    );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-50 font-sans text-zinc-900 md:flex-row">
      {/* Sidebar (Bottom Bar on Mobile, Left Sidebar on Desktop) */}
      <aside className="fixed bottom-0 left-0 z-50 flex w-full border-t border-zinc-200 bg-white/90 py-2 shadow-xl backdrop-blur-lg md:relative md:h-full md:w-20 md:flex-col md:items-center md:gap-8 md:border-t-0 md:border-r md:py-8">
        <div className="hidden text-zinc-800 md:block">
          <ShieldCheck size={32} />
        </div>

        <nav className="flex w-full items-center justify-around md:flex-col md:gap-6">
          <NavButton
            active={activeTab === "monitor"}
            onClick={() => setActiveTab("monitor")}
            icon={<Monitor size={28} />}
            label="Suivi"
          />
          <NavButton
            active={activeTab === "students"}
            onClick={() => setActiveTab("students")}
            icon={<Users size={28} />}
            label="Élèves"
          />
          <NavButton
            active={activeTab === "sessions"}
            onClick={() => setActiveTab("sessions")}
            icon={<CalendarDays size={28} />}
            label="Sessions"
          />
          <button
            onClick={logout}
            className="flex flex-col items-center gap-1 text-zinc-500 transition hover:text-red-500 md:mt-auto"
          >
            <LogOut size={28} />
            <span className="text-[10px] font-black tracking-tighter uppercase md:hidden">
              Quitter
            </span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden pb-16 md:pb-0">
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white/50 px-4 backdrop-blur-md md:px-8">
          <h1 className="text-sm font-black tracking-widest text-blue-400 uppercase md:text-xl">
            {activeTab === "monitor"
              ? "Monitorage"
              : activeTab === "students"
                ? "Élèves"
                : "Sessions"}
          </h1>
          <div className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase md:text-xs">
            {user?.name}
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {activeTab === "monitor" && (
            <div className="flex h-full flex-col md:flex-row">
              <aside className="custom-scrollbar flex h-1/3 flex-col gap-2 overflow-y-auto border-b border-zinc-200 p-2 md:h-full md:w-64 md:border-r md:border-b-0 md:p-4">
                <select
                  value={monitorSessionFilter}
                  onChange={(e) => {
                    setMonitorSessionFilter(e.target.value);
                    setSelectedThread(null);
                  }}
                  className="mb-2 w-full rounded-lg border border-zinc-200 bg-white p-2 text-xs font-bold text-zinc-700 outline-none focus:border-blue-500"
                >
                  <option value="all">Toutes les sessions</option>
                  <option value="free-discussion">Discussion libre</option>
                  {(Array.isArray(sessions) ? sessions : []).map((s: any) => (
                    <option key={s._id} value={s._id}>
                      {s.title}
                    </option>
                  ))}
                </select>
                {(Array.isArray(threads) ? threads : [])
                  .filter(
                    (t) =>
                      monitorSessionFilter === "all" ||
                      t.sessionId === monitorSessionFilter,
                  )
                  .map((t) => (
                    <div
                      key={t._id}
                      onClick={() => setSelectedThread(t)}
                      className={`group/card relative cursor-pointer rounded-xl border p-3 transition-all ${selectedThread?._id === t._id ? "border-blue-400 bg-blue-50" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="overflow-hidden">
                          <div
                            className={`truncate font-bold tracking-tight uppercase ${selectedThread?._id === t._id ? "text-blue-600" : "text-zinc-800"}`}
                          >
                            {t.studentName}
                          </div>
                          <div className="mt-1 truncate text-[10px] font-bold text-zinc-500">
                            {t.topic || "Discussion"}
                          </div>
                        </div>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                `Supprimer l'historique de ${t.studentName} ?`,
                              )
                            ) {
                              const res = await fetch(`/api/threads/${t._id}`, {
                                method: "DELETE",
                              });
                              if (res.ok) {
                                if (selectedThread?._id === t._id) {
                                  setSelectedThread(null);
                                }
                                fetchData(true);
                              }
                            }
                          }}
                          className="ml-2 flex-shrink-0 text-zinc-400 opacity-0 transition group-hover/card:opacity-100 hover:text-red-500"
                          title="Supprimer la discussion"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
              </aside>
              <main className="relative flex flex-[3] overflow-hidden bg-white">
                <div className="flex flex-1 flex-col overflow-hidden">
                  {selectedThread ? (
                    <ThreadViewer
                      key={`${selectedThread._id}-${selectedThread.messages?.length ?? 0}-${selectedThread.updatedAt || ""}`}
                      thread={selectedThread}
                      students={students}
                      sessions={sessions}
                      onAssign={updateStudent}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center font-bold tracking-widest text-zinc-400 uppercase">
                      Sélectionnez une discussion
                    </div>
                  )}
                </div>
              </main>
              {selectedThread && (
                <aside className="custom-scrollbar relative flex h-full max-w-[400px] min-w-[320px] flex-[1.2] flex-col overflow-y-auto border-l border-zinc-200 bg-zinc-50">
                  <div className="flex-1 p-6 pb-20">
                    <h4 className="mb-6 text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                      Fiche Élève
                    </h4>
                    {(() => {
                      const student = students.find(
                        (s: any) => s.studentId === selectedThread.studentId,
                      );
                      if (!student)
                        return (
                          <div className="text-xs text-zinc-600">
                            Profil non trouvé
                          </div>
                        );
                      return (
                        <StudentCard
                          student={student}
                          sessions={sessions}
                          threads={threads}
                          onUpdate={updateStudent}
                          onDelete={() => {}} // No delete from monitor view
                          isCompact
                        />
                      );
                    })()}
                  </div>
                </aside>
              )}
            </div>
          )}

          {activeTab === "students" && (
            <StudentManager
              students={students}
              sessions={sessions}
              threads={threads}
              refresh={fetchData}
              updateStudent={updateStudent}
            />
          )}

          {activeTab === "sessions" && (
            <SessionManager
              students={students}
              sessions={sessions}
              refresh={fetchData}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function StudentCard({
  student,
  sessions,
  threads,
  onUpdate,
  onDelete,
  isCompact,
}: any) {
  const [localNativeLanguage, setLocalNativeLanguage] = useState(
    student.nativeLanguage || "",
  );
  const [showDescription, setShowDescription] = useState(false);
  const [localDescription, setLocalDescription] = useState(
    student.description || "",
  );
  const [localSkills, setLocalSkills] = useState({
    vocabulary: student.skillsSummary?.vocabulary ?? 0,
    grammar: student.skillsSummary?.grammar ?? 0,
    comprehension: student.skillsSummary?.comprehension ?? 0,
    mathLogic: student.skillsSummary?.mathLogic ?? 0,
  });

  // Update local state if prop changes
  useEffect(() => {
    setLocalNativeLanguage(student.nativeLanguage || "");
    setLocalDescription(student.description || "");
    setLocalSkills({
      vocabulary: student.skillsSummary?.vocabulary ?? 0,
      grammar: student.skillsSummary?.grammar ?? 0,
      comprehension: student.skillsSummary?.comprehension ?? 0,
      mathLogic: student.skillsSummary?.mathLogic ?? 0,
    });
  }, [student.nativeLanguage, student.description, student.skillsSummary]);

  const commitSkill = (key: string, value: number) => {
    const updated = { ...localSkills, [key]: value };
    setLocalSkills(updated);
    onUpdate(student._id, { skillsSummary: updated });
  };

  const isActive =
    student.lastActive &&
    new Date().getTime() - new Date(student.lastActive).getTime() <
      1000 * 60 * 5; // 5 minutes threshold

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
      <div className="flex items-center justify-end">
        <div className="font-mono text-[10px] font-bold text-blue-500 opacity-60">
          ID: {student.studentId}
        </div>
      </div>

      <h3 className="mt-2 mb-1 text-xl font-black text-zinc-900 uppercase">
        {student.firstName} {student.lastName}
      </h3>

      <button
        onClick={() => setShowDescription(true)}
        className="mb-4 flex items-center gap-1 text-xs font-bold text-blue-600 transition-all hover:text-blue-500 hover:underline"
      >
        <span>📝</span> Description & Notes
      </button>
      <div className="mb-4">
        <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">
          Sessions assignées :
        </span>
        <div className="mt-1 flex flex-wrap gap-1">
          {student.sessionIds && student.sessionIds.length > 0 ? (
            student.sessionIds.map((sid: string) => {
              const sess = sessions.find((s: any) => s._id === sid);
              return sess ? (
                <div
                  key={sid}
                  className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600"
                >
                  {sess.title}
                </div>
              ) : null;
            })
          ) : (
            <div className="text-[10px] font-bold text-zinc-400 italic">
              Aucune session assignée
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
        <label className="mb-3 block text-[10px] font-black tracking-widest text-zinc-500 uppercase">
          Évaluation des compétences
        </label>
        <div className="space-y-3">
          <SkillSlider
            label="Vocabulaire"
            value={localSkills.vocabulary}
            color="accent-blue-500"
            onChange={(v) =>
              setLocalSkills((s: any) => ({ ...s, vocabulary: v }))
            }
            onCommit={(v) => commitSkill("vocabulary", v)}
          />
          <SkillSlider
            label="Grammaire"
            value={localSkills.grammar}
            color="accent-purple-500"
            onChange={(v) => setLocalSkills((s: any) => ({ ...s, grammar: v }))}
            onCommit={(v) => commitSkill("grammar", v)}
          />
          <SkillSlider
            label="Compréhension"
            value={localSkills.comprehension}
            color="accent-emerald-500"
            onChange={(v) =>
              setLocalSkills((s: any) => ({ ...s, comprehension: v }))
            }
            onCommit={(v) => commitSkill("comprehension", v)}
          />
          <SkillSlider
            label="Logique Math"
            value={localSkills.mathLogic}
            color="accent-amber-500"
            onChange={(v) =>
              setLocalSkills((s: any) => ({ ...s, mathLogic: v }))
            }
            onCommit={(v) => commitSkill("mathLogic", v)}
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <LevelBadge label="LANG" value={localNativeLanguage} />
        <LevelBadge label="FR" value={student.frenchLevel} />
        <LevelBadge label="MATH" value={student.mathLevel || "<6ème"} />
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-[10px] font-black text-zinc-500 uppercase">
            Langue Maternelle
          </label>
          <input
            value={localNativeLanguage}
            onChange={(e) => setLocalNativeLanguage(e.target.value)}
            onBlur={() =>
              onUpdate(student._id, {
                nativeLanguage: localNativeLanguage,
              })
            }
            placeholder="Langue maternelle"
            className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-2 block text-[10px] font-black text-zinc-500 uppercase">
              Niveau Français
            </label>
            <select
              value={student.frenchLevel}
              onChange={(e) =>
                onUpdate(student._id, { frenchLevel: e.target.value })
              }
              className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="A1">Niveau A1</option>
              <option value="A2">Niveau A2</option>
              <option value="B1">Niveau B1</option>
              <option value="B2">Niveau B2</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-2 block text-[10px] font-black text-zinc-500 uppercase">
              Niveau Math
            </label>
            <select
              value={student.mathLevel || "<6ème"}
              onChange={(e) =>
                onUpdate(student._id, { mathLevel: e.target.value })
              }
              className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {MATH_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-3 block text-[10px] font-black text-zinc-500 uppercase">
            Sessions Pédagogiques
          </label>
          <div className="custom-scrollbar max-h-40 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-sm">
            {(() => {
              const compatibleSessions = (
                Array.isArray(sessions) ? sessions : []
              ).filter((sess: any) => {
                const isAssigned = student.sessionIds?.includes(sess._id);
                const isCompatible =
                  !sess.mathLevel || sess.mathLevel === student.mathLevel;
                return isCompatible || isAssigned;
              });

              if (compatibleSessions.length === 0) {
                return (
                  <div className="py-4 text-center text-[10px] font-bold text-zinc-400 uppercase">
                    Aucune session compatible
                  </div>
                );
              }

              return compatibleSessions.map((sess: any) => {
                const isAssigned = student.sessionIds?.includes(sess._id);
                const isCompatible =
                  !sess.mathLevel || sess.mathLevel === student.mathLevel;

                return (
                  <div
                    key={sess._id}
                    className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-1 last:border-0"
                  >
                    <div className="flex flex-col">
                      <span
                        className={`font-bold ${isCompatible ? "text-zinc-800" : "text-red-500 italic"}`}
                      >
                        {sess.title}
                        {!isCompatible && " (Incompatible)"}
                      </span>
                      <span className="font-mono text-[9px] text-zinc-500">
                        {sess.mathLevel || "Général"}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        onUpdate(student._id, {
                          action: isAssigned ? "removeSession" : "addSession",
                          sessionId: sess._id,
                        });
                      }}
                      className={`rounded px-2 py-1 text-[9px] font-black uppercase transition-all ${
                        isAssigned
                          ? "border border-red-200 bg-red-50 text-red-600 hover:border-red-600 hover:bg-red-600 hover:text-white"
                          : "border border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                      }`}
                    >
                      {isAssigned ? "Retirer" : "Ajouter"}
                    </button>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {!isCompact && (
        <button
          onClick={onDelete}
          className="mt-6 text-xs font-bold text-red-500 uppercase opacity-0 transition-all group-hover:opacity-100 hover:text-red-600"
        >
          Supprimer le profil
        </button>
      )}

      {showDescription && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            setShowDescription(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-xl font-black text-zinc-900 uppercase">
              Description
            </h3>
            <textarea
              className="mb-4 h-40 w-full resize-none rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-900 shadow-sm transition-all outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              onBlur={() =>
                onUpdate(student._id, { description: localDescription })
              }
              placeholder="Ajouter des observations, difficultés, points forts..."
            />
            <button
              onClick={() => {
                onUpdate(student._id, { description: localDescription });
                setShowDescription(false);
              }}
              className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white shadow-sm transition hover:bg-blue-500"
            >
              Fermer et Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${
        active ? "scale-110 text-blue-600" : "text-zinc-400 hover:text-zinc-600"
      }`}
    >
      {icon}
      <span className="text-[10px] font-black tracking-tighter uppercase">
        {label}
      </span>
    </button>
  );
}

function StudentManager({
  students,
  sessions,
  threads,
  refresh,
  updateStudent,
}: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    description: "",
    nativeLanguage: "Français",
    frenchLevel: "A1",
    mathLevel: "<6ème",
  });

  const filteredStudents = (Array.isArray(students) ? students : []).filter(
    (s: any) => {
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLevel = levelFilter === "all" || s.mathLevel === levelFilter;
      return matchesSearch && matchesLevel;
    },
  );

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      setShowAdd(false);
      setFormData({
        firstName: "",
        lastName: "",
        description: "",
        nativeLanguage: "Français",
        frenchLevel: "A1",
        mathLevel: "<6ème",
      });
      refresh();
    }
  };

  return (
    <div className="custom-scrollbar h-full overflow-y-auto bg-white p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-black tracking-tighter text-zinc-900 uppercase md:text-3xl">
          Annuaire des élèves
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => printStudentList(filteredStudents)}
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-6 py-3 text-sm font-bold tracking-widest text-indigo-600 uppercase transition-all hover:bg-indigo-100"
          >
            📄 EXPORTER PDF
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold tracking-widest text-white uppercase shadow-sm transition-all hover:bg-blue-600"
          >
            + Ajouter un élève
          </button>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-4 flex items-center text-zinc-500">
            🔍
          </span>
          <input
            type="text"
            placeholder="Rechercher par nom ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pr-4 pl-12 text-sm text-zinc-900 shadow-sm transition-all outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-zinc-500 uppercase">
            Filtrer par classe :
          </span>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm transition-all outline-none focus:border-blue-500"
          >
            <option value="all">Toutes les classes</option>
            {MATH_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <div className="text-xs font-bold text-zinc-600 uppercase">
            {filteredStudents.length}{" "}
            {filteredStudents.length > 1 ? "élèves" : "élève"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredStudents.map((s: any) => (
          <StudentCard
            key={s._id}
            student={s}
            sessions={sessions}
            threads={threads}
            onUpdate={updateStudent}
            onDelete={async () => {
              if (confirm("Supprimer ?")) {
                await fetch(`/api/students/${s._id}`, { method: "DELETE" });
                refresh();
              }
            }}
          />
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="flex h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 bg-zinc-50 text-zinc-500">
          <div className="text-4xl opacity-50">👤</div>
          <p className="mt-4 font-bold tracking-widest uppercase">
            Aucun élève trouvé
          </p>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-2xl">
            <h3 className="mb-6 text-2xl font-black text-zinc-900 uppercase">
              Nouvel Élève
            </h3>
            <form onSubmit={addStudent} className="space-y-4">
              <input
                placeholder="Prénom"
                className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
              />
              <input
                placeholder="Nom"
                className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
              />
              <textarea
                placeholder="Notes ou description de l'élève (optionnel)"
                className="h-24 w-full resize-none rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
              <input
                placeholder="Langue Maternelle"
                className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={formData.nativeLanguage}
                onChange={(e) =>
                  setFormData({ ...formData, nativeLanguage: e.target.value })
                }
                required
              />

              <div className="flex gap-2">
                <select
                  className="flex-1 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={formData.frenchLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, frenchLevel: e.target.value })
                  }
                >
                  <option value="A1">FR A1</option>
                  <option value="A2">FR A2</option>
                  <option value="B1">FR B1</option>
                  <option value="B2">FR B2</option>
                </select>

                <select
                  className="flex-1 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={formData.mathLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, mathLevel: e.target.value })
                  }
                >
                  {MATH_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

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

function SessionManager({ students, sessions, refresh }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [showStudentList, setShowStudentList] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [formData, setFormData] = useState({
    title: "",
    objective: "",
    subject: "Mathématiques",
    mathLevel: "<6ème",
    documents: [] as { name: string; url: string }[],
  });

  const [isUploading, setIsUploading] = useState(false);

  const filteredSessions = (Array.isArray(sessions) ? sessions : []).filter(
    (s: any) => {
      const matchesSearch =
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLevel = levelFilter === "all" || s.mathLevel === levelFilter;
      return matchesSearch && matchesLevel;
    },
  );

  useEffect(() => {
    if (editingSession) {
      setFormData({
        title: editingSession.title,
        objective: editingSession.objective,
        subject: editingSession.subject,
        mathLevel: editingSession.mathLevel || "<6ème",
        documents: editingSession.documents || [],
      });
      setShowAdd(true);
    } else {
      setFormData({
        title: "",
        objective: "",
        subject: "Mathématiques",
        mathLevel: "<6ème",
        documents: [],
      });
    }
  }, [editingSession]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });
      const data = await res.json();
      if (data.success) {
        setFormData((prev) => ({
          ...prev,
          documents: [...prev.documents, { name: data.name, url: data.url }],
        }));
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Upload error");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const addSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingSession
      ? `/api/sessions/${editingSession._id}`
      : "/api/sessions";
    const method = editingSession ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      setShowAdd(false);
      setEditingSession(null);
      refresh();
    }
  };

  const batchAssign = async (sessionId: string) => {
    await Promise.all(
      selectedStudents.map((studentId) =>
        fetch(`/api/students/${studentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "addSession", sessionId }),
        }),
      ),
    );
    setShowAssign(null);
    setSelectedStudents([]);
    refresh();
  };

  return (
    <div className="custom-scrollbar h-full overflow-y-auto p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-black tracking-tighter uppercase md:text-3xl">
          Catalogue des Sessions
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold tracking-widest text-white uppercase shadow-sm transition-all hover:bg-emerald-600"
          >
            + Créer une session
          </button>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-4 flex items-center text-zinc-400">
            🔍
          </span>
          <input
            type="text"
            placeholder="Rechercher une session..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pr-4 pl-12 text-sm text-zinc-900 shadow-sm transition-all outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-zinc-500 uppercase">
            Filtrer par niveau :
          </span>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm transition-all outline-none focus:border-emerald-500"
          >
            <option value="all">Tous les niveaux</option>
            {MATH_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <div className="text-xs font-bold text-zinc-500 uppercase">
            {filteredSessions.length}{" "}
            {filteredSessions.length > 1 ? "sessions" : "session"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {filteredSessions.map((s: any) => (
          <div
            key={s._id}
            className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-md transition-shadow hover:shadow-lg"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-600 uppercase">
                  {s.subject}
                </span>
                {s.mathLevel && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-600 uppercase">
                    {s.mathLevel}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingSession(s)}
                  className="text-zinc-400 transition hover:text-blue-500"
                  title="Modifier la session"
                >
                  ✏️
                </button>
                <button
                  onClick={async () => {
                    if (confirm("Supprimer cette session ?")) {
                      await fetch(`/api/sessions/${s._id}`, {
                        method: "DELETE",
                      });
                      refresh();
                    }
                  }}
                  className="text-zinc-400 transition hover:text-red-500"
                  title="Supprimer la session"
                >
                  🗑️
                </button>
              </div>
            </div>
            <h3 className="mb-2 text-2xl font-black tracking-tight text-zinc-900 uppercase">
              {s.title}
            </h3>
            <p className="mb-4 text-sm leading-relaxed text-zinc-500">
              {s.objective}
            </p>

            {s.documents && s.documents.length > 0 && (
              <div className="mb-4">
                <label className="mb-1 block text-[10px] font-black text-zinc-400 uppercase">
                  Documents
                </label>
                <div className="flex flex-wrap gap-2">
                  {s.documents.map((doc: any, idx: number) => (
                    <a
                      key={idx}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-zinc-200 bg-zinc-100 px-2 py-1 text-[10px] text-blue-600 hover:bg-blue-50 hover:underline"
                    >
                      📄 {doc.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                  Créé le {new Date(s.createdAt).toLocaleDateString()}
                </div>
                <button
                  onClick={() => setShowStudentList(s._id)}
                  className="w-fit text-[10px] font-black text-blue-600 uppercase transition-all hover:text-blue-500 hover:underline"
                >
                  👥{" "}
                  {
                    students.filter((st: any) => st.sessionIds?.includes(s._id))
                      .length
                  }{" "}
                  élèves inscrits
                </button>
              </div>
              <button
                onClick={() => setShowAssign(s._id)}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-600 transition hover:bg-blue-600 hover:text-white"
              >
                👥 Assigner des élèves
              </button>
            </div>
          </div>
        ))}
      </div>

      {showStudentList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-black text-zinc-900 uppercase">
                Liste des élèves
              </h3>
              <button
                onClick={() => setShowStudentList(null)}
                className="text-zinc-500 hover:text-zinc-900"
              >
                ✕
              </button>
            </div>
            <div className="mb-6 max-h-60 space-y-2 overflow-y-auto">
              {(() => {
                const sessionStudents = students.filter((st: any) =>
                  st.sessionIds?.includes(showStudentList),
                );
                if (sessionStudents.length === 0) {
                  return (
                    <div className="py-8 text-center text-sm font-bold text-zinc-500 uppercase">
                      Aucun élève dans cette session
                    </div>
                  );
                }
                return sessionStudents.map((st: any) => (
                  <div
                    key={st._id}
                    className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 p-4"
                  >
                    <div>
                      <div className="text-sm font-bold text-zinc-900 uppercase">
                        {st.firstName} {st.lastName}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        ID: {st.studentId}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (
                          confirm(`Retirer ${st.firstName} de cette session ?`)
                        ) {
                          await fetch(`/api/students/${st._id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "removeSession",
                              sessionId: showStudentList,
                            }),
                          });
                          refresh();
                        }
                      }}
                      className="rounded-lg bg-red-50 px-3 py-1 text-[10px] font-bold text-red-600 transition-all hover:bg-red-600 hover:text-white"
                      title="Retirer de la session"
                    >
                      Retirer
                    </button>
                  </div>
                ));
              })()}
            </div>
            <button
              onClick={() => setShowStudentList(null)}
              className="w-full rounded-xl bg-zinc-100 py-4 font-black tracking-widest text-zinc-900 uppercase transition-all hover:bg-zinc-200"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-2xl">
            <h3 className="mb-6 text-2xl font-black text-zinc-900 uppercase">
              Assigner des élèves à la session
            </h3>
            <div className="mb-6 max-h-60 space-y-2 overflow-y-auto">
              {students.map((st: any) => {
                const currentSess = sessions.find(
                  (sess: any) => sess._id === showAssign,
                );
                const isLevelCompatible =
                  !currentSess?.mathLevel ||
                  st.mathLevel === currentSess.mathLevel;

                return (
                  <label
                    key={st._id}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                      isLevelCompatible
                        ? "cursor-pointer border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
                        : "cursor-not-allowed border-red-100 bg-red-50/50 opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!isLevelCompatible}
                      checked={selectedStudents.includes(st._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudents([...selectedStudents, st._id]);
                        } else {
                          setSelectedStudents(
                            selectedStudents.filter((id) => id !== st._id),
                          );
                        }
                      }}
                      className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-zinc-900 uppercase">
                          {st.firstName} {st.lastName}
                        </div>
                        <div className="flex gap-2">
                          {!isLevelCompatible && (
                            <div className="rounded bg-red-100 px-1.5 py-0.5 text-[8px] font-black text-red-600 uppercase">
                              Incompatible
                            </div>
                          )}
                          <div
                            className={`rounded px-1.5 py-0.5 text-[9px] font-black ${
                              !isLevelCompatible
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {st.mathLevel || "<6ème"}
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        ID: {st.studentId}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => batchAssign(showAssign)}
                disabled={selectedStudents.length === 0}
                className="flex-1 rounded-xl bg-blue-600 py-4 font-black tracking-widest uppercase disabled:opacity-50"
              >
                Assigner {selectedStudents.length} élèves
              </button>
              <button
                onClick={() => {
                  setShowAssign(null);
                  setSelectedStudents([]);
                }}
                className="flex-1 py-4 font-bold text-zinc-500"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-8 shadow-2xl">
            <h3 className="mb-6 text-2xl font-black text-zinc-900 uppercase">
              {editingSession ? "Modifier la Session" : "Nouvelle Session"}
            </h3>
            <form onSubmit={addSession} className="space-y-4">
              <input
                placeholder="Titre de la session (ex: Les Fractions)"
                className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
              <textarea
                placeholder="Objectif pédagogique pour l'IA (ex: Guide l'élève à travers la multiplication des fractions...)"
                className="h-32 w-full resize-none rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={formData.objective}
                onChange={(e) =>
                  setFormData({ ...formData, objective: e.target.value })
                }
                required
              />
              <select
                className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
              >
                <option value="Mathématiques">Mathématiques</option>
                <option value="Français">Français</option>
                <option value="Sciences">Sciences</option>
              </select>

              <select
                className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={formData.mathLevel}
                onChange={(e) =>
                  setFormData({ ...formData, mathLevel: e.target.value })
                }
              >
                {MATH_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    Niveau Math : {level}
                  </option>
                ))}
              </select>

              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <label className="mb-2 block text-[10px] font-black text-zinc-500 uppercase">
                  Documents de la session
                </label>
                <div className="mb-4 space-y-2">
                  {formData.documents.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-zinc-100 p-2 text-xs text-zinc-700"
                    >
                      <span className="truncate pr-4">📄 {doc.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            documents: formData.documents.filter(
                              (_, i) => i !== idx,
                            ),
                          })
                        }
                        className="text-red-500 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition-all ${
                      isUploading
                        ? "cursor-not-allowed border-zinc-700 bg-zinc-900 opacity-50"
                        : "border-zinc-700 hover:border-blue-500 hover:bg-blue-500/10"
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-blue-500" />
                        <span className="text-xs font-bold text-zinc-500 uppercase">
                          Téléchargement...
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">📁</span>
                        <span className="text-xs font-bold text-zinc-400 uppercase">
                          Ajouter un fichier (PDF, Word, Image...)
                        </span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-600 py-4 font-black tracking-widest uppercase"
              >
                {editingSession
                  ? "Enregistrer les modifications"
                  : "Lancer la session"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setEditingSession(null);
                }}
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
  let colorStyles = "border-zinc-200 bg-zinc-50 text-zinc-900";
  if (label === "LANG")
    colorStyles = "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (label === "FR") colorStyles = "border-blue-200 bg-blue-50 text-blue-700";
  if (label === "MATH")
    colorStyles = "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 shadow-sm ${colorStyles}`}
    >
      <span className="text-[10px] font-black uppercase opacity-70">
        {label}:
      </span>
      <span className="text-xs font-bold">{value}</span>
    </div>
  );
}

function SkillSlider({
  label,
  value,
  color,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  color: string;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[9px] font-bold uppercase">
        <span className="text-zinc-500">{label}</span>
        <span className="text-zinc-900">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        className={`h-1.5 w-full cursor-pointer ${color}`}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={(e) =>
          onCommit(Number((e.target as HTMLInputElement).value))
        }
        onTouchEnd={(e) =>
          onCommit(Number((e.target as HTMLInputElement).value))
        }
        onKeyUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
      />
    </div>
  );
}

// Inner component for ThreadViewer – must be INSIDE AssistantRuntimeProvider
function ThreadViewerInner({
  thread,
  students,
  sessions,
  onAssign,
}: {
  thread: any;
  students: any[];
  sessions: any[];
  onAssign: (id: string, data: any) => Promise<void>;
}) {
  // useThread runs inside AssistantRuntimeProvider — correct context
  const liveMessages = useThread((t) => t.messages);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showAssignSession, setShowAssignSession] = useState(false);
  const [assignSessionId, setAssignSessionId] = useState("");

  const student = students.find((s: any) => s.studentId === thread.studentId);

  const handleAssignSession = async () => {
    if (!student || !assignSessionId) return;
    await onAssign(student._id, {
      action: "addSession",
      sessionId: assignSessionId,
    });
    setShowAssignSession(false);
    setAssignSessionId("");
  };

  const handlePrint = () => {
    printPDF(liveMessages as any[], {
      title: `Rapport - ${thread.studentName || ""}`,
      studentName: thread.studentName,
      topic: thread.topic,
      level: thread.languageLevel ?? "A1",
      mathLevel: thread.mathLevel,
    });
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    try {
      const res = await fetch(`/api/summary/${thread._id}`, {
        method: "POST",
      });
      const data = await res.json();
      setSummary(
        data.summary ??
          [data.error, data.details].filter(Boolean).join(" : ") ??
          "Erreur lors de la génération du rapport.",
      );
    } catch (err) {
      console.error(err);
      setSummary("Erreur lors de la génération du rapport.");
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 p-4">
        <div className="text-sm font-bold text-zinc-600">
          Discussion de{" "}
          <span className="text-zinc-900">{thread.studentName}</span>
          <span className="ml-2 text-xs text-zinc-500">
            ({liveMessages.length} message{liveMessages.length !== 1 ? "s" : ""}
            )
          </span>
          <span
            className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
              thread.status === "completed"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {thread.status === "completed" ? "Terminée" : "En cours"}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAssignSession(true)}
            disabled={!student}
            title={!student ? "Profil élève introuvable" : ""}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold tracking-wider text-white uppercase shadow-sm transition-all hover:bg-emerald-500 disabled:opacity-50"
          >
            👥 Assigner à une session
          </button>
          <button
            onClick={handleSummarize}
            disabled={isSummarizing || thread.status !== "completed"}
            title={
              thread.status !== "completed"
                ? "L'élève doit d'abord terminer la session"
                : ""
            }
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold tracking-wider text-white uppercase shadow-sm transition-all hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSummarizing ? "Analyse..." : "🧠 Générer le rapport"}
          </button>
          <button
            onClick={handlePrint}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold tracking-wider text-white uppercase shadow-sm transition-all hover:bg-blue-500"
          >
            📄 Imprimer / PDF
          </button>
        </div>
      </div>
      <div className="teacher-readonly-thread relative min-h-0 flex-1 bg-white">
        <Thread />
      </div>

      {showAssignSession && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowAssignSession(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-xl font-black text-zinc-900 uppercase">
              Assigner {thread.studentName} à une session
            </h3>
            <select
              value={assignSessionId}
              onChange={(e) => setAssignSessionId(e.target.value)}
              className="mb-4 w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Sélectionner une session...</option>
              {(Array.isArray(sessions) ? sessions : [])
                .filter((sess: any) => !student?.sessionIds?.includes(sess._id))
                .map((sess: any) => (
                  <option key={sess._id} value={sess._id}>
                    {sess.title} {sess.mathLevel ? `(${sess.mathLevel})` : ""}
                  </option>
                ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={handleAssignSession}
                disabled={!assignSessionId}
                className="flex-1 rounded-xl bg-emerald-600 py-3 font-black tracking-widest text-white uppercase disabled:opacity-50"
              >
                Assigner
              </button>
              <button
                onClick={() => setShowAssignSession(false)}
                className="flex-1 py-3 font-bold text-zinc-500"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {summary !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setSummary(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-xl font-black text-zinc-900 uppercase">
              Rapport de session
            </h3>
            <div className="text-sm whitespace-pre-wrap text-zinc-700">
              {summary}
            </div>
            <button
              onClick={() => setSummary(null)}
              className="mt-6 w-full rounded-xl bg-zinc-100 py-3 font-bold text-zinc-900 uppercase transition-all hover:bg-zinc-200"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ThreadViewer({
  thread,
  students,
  sessions,
  onAssign,
}: {
  thread: any;
  students: any[];
  sessions: any[];
  onAssign: (id: string, data: any) => Promise<void>;
}) {
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
      <ThreadViewerInner
        thread={thread}
        students={students}
        sessions={sessions}
        onAssign={onAssign}
      />
    </AssistantRuntimeProvider>
  );
}
