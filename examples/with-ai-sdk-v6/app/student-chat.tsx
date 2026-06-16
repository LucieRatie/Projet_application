"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider, useThread } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";

// ─── helper: extraire le texte brut d'un message (ThreadMessage ou MongoDB brut) ────
function extractText(msg: any): string {
  if (!msg?.content) return "";
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text ?? "")
      .join("");
  }
  return JSON.stringify(msg.content);
}

// ─── helper: convertir messages MongoDB ➜ format UIMessage pour AI SDK v6 ────────
function mongoToUIMessages(raw: any[]): any[] {
  return raw.map((m: any, i: number) => ({
    id: m._id?.toString() ?? `hist-${i}`,
    role: m.role as "user" | "assistant",
    parts: Array.isArray(m.content)
      ? m.content.map((p: any) => ({
          type: "text" as const,
          text: p.text ?? "",
        }))
      : [
          {
            type: "text" as const,
            text: typeof m.content === "string" ? m.content : "",
          },
        ],
    content: Array.isArray(m.content)
      ? m.content.map((p: any) => p.text ?? "").join("")
      : typeof m.content === "string"
        ? m.content
        : "",
  }));
}

// ─── PDF Printer ─────────────────────────────────────────────────────────────
function printPDF(
  messages: any[],
  meta: { title: string; sessionTitle?: string; level?: string },
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
    Session : ${meta.sessionTitle ?? "Discussion libre"}<br/>
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

// ═══════════════════════════════════════════════════════════════════════════════
// StudentChatInner: runs INSIDE <AssistantRuntimeProvider> to access thread
// ═══════════════════════════════════════════════════════════════════════════════
function StudentChatInner({
  user,
  session,
  onMessagesChange,
}: {
  user: any;
  session: any;
  onMessagesChange: (msgs: any[]) => void;
}) {
  const [activeTab, setActiveTab] = useState<"chat" | "docs" | "profil">(
    "chat",
  );
  const messages = useThread((t) => t.messages);

  useEffect(() => {
    onMessagesChange(messages as any[]);
  }, [messages, onMessagesChange]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar Navigation (Tabs) */}
      <aside className="flex w-20 flex-col items-center gap-8 border-r-4 border-black bg-zinc-900 py-8">
        <TabButton
          active={activeTab === "chat"}
          onClick={() => setActiveTab("chat")}
          icon="💬"
          label="Chat"
        />
        <TabButton
          active={activeTab === "docs"}
          onClick={() => setActiveTab("docs")}
          icon="📚"
          label="Docs"
        />
        <TabButton
          active={activeTab === "profil"}
          onClick={() => setActiveTab("profil")}
          icon="👤"
          label="Profil"
        />
      </aside>

      {/* Main Content Area */}
      <main className="relative flex-1 overflow-hidden bg-white">
        {activeTab === "chat" && (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <Thread />
            </div>
          </div>
        )}

        {activeTab === "docs" && (
          <div className="h-full overflow-y-auto p-8">
            <h2 className="mb-6 text-3xl font-black tracking-tighter uppercase">
              📚 Documents de cours
            </h2>
            {session?.documents && session.documents.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {session.documents.map((doc: any, idx: number) => (
                  <a
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 rounded-2xl border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1"
                  >
                    <div className="text-4xl">📄</div>
                    <div>
                      <div className="font-black uppercase">{doc.name}</div>
                      <div className="text-xs font-bold text-zinc-500">
                        Cliquer pour ouvrir
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-3xl border-4 border-dashed border-zinc-300 bg-zinc-50 text-zinc-400">
                <div className="text-5xl opacity-30 grayscale">📂</div>
                <p className="mt-4 font-bold tracking-widest uppercase">
                  Aucun document pour cette session
                </p>
              </div>
            )}

            <div className="mt-8 rounded-3xl border-4 border-black bg-yellow-100 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="mb-2 font-black tracking-tight uppercase">
                💡 Objectif pédagogique
              </h3>
              <p className="text-lg leading-relaxed font-medium">
                {session?.objective ?? "Apprendre et progresser avec l'IA."}
              </p>
            </div>
          </div>
        )}

        {activeTab === "profil" && (
          <div className="h-full overflow-y-auto p-8">
            <h2 className="mb-8 text-3xl font-black tracking-tighter uppercase">
              👤 Mon Profil
            </h2>

            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="mb-4 text-sm font-black tracking-widest text-zinc-500 uppercase">
                  Mes Compétences
                </h3>
                <div className="space-y-4">
                  <SkillBar
                    label="Vocabulaire"
                    value={user.studentData?.skillsSummary?.vocabulary ?? 0}
                    color="bg-blue-500"
                  />
                  <SkillBar
                    label="Grammaire"
                    value={user.studentData?.skillsSummary?.grammar ?? 0}
                    color="bg-emerald-500"
                  />
                  <SkillBar
                    label="Compréhension"
                    value={user.studentData?.skillsSummary?.comprehension ?? 0}
                    color="bg-purple-500"
                  />
                  <SkillBar
                    label="Logique Math"
                    value={user.studentData?.skillsSummary?.mathLogic ?? 0}
                    color="bg-orange-500"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <h3 className="mb-2 text-sm font-black tracking-widest text-zinc-500 uppercase">
                    Niveaux Actuels
                  </h3>
                  <div className="flex gap-3">
                    <div className="rounded-xl border-2 border-black bg-zinc-100 px-4 py-2 text-center">
                      <div className="text-[10px] font-black uppercase">FR</div>
                      <div className="text-lg font-black text-blue-600">
                        {user.studentData?.frenchLevel}
                      </div>
                    </div>
                    <div className="rounded-xl border-2 border-black bg-zinc-100 px-4 py-2 text-center">
                      <div className="text-[10px] font-black uppercase">
                        MATH
                      </div>
                      <div className="text-lg font-black text-emerald-600">
                        {user.studentData?.mathLevel}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border-4 border-black bg-zinc-900 p-6 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
                  <h3 className="mb-2 text-sm font-black tracking-widest text-zinc-400 uppercase">
                    ID Étudiant
                  </h3>
                  <code className="text-2xl font-black tracking-widest text-yellow-400">
                    {user.studentId}
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all hover:scale-110 ${active ? "text-yellow-400" : "text-zinc-500 hover:text-white"}`}
    >
      <span className="text-3xl">{icon}</span>
      <span className="text-[10px] font-black tracking-tighter uppercase">
        {label}
      </span>
    </button>
  );
}

function SkillBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="mb-4 rounded-2xl border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-black tracking-tight uppercase">
          {label}
        </span>
        <span className="text-xl font-black">{value}%</span>
      </div>
      <div className="h-5 w-full overflow-hidden rounded-full border-2 border-black bg-zinc-100">
        <div
          className={`h-full ${color} transition-all duration-1000`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function StudentChatContent({
  initialMessages,
  user,
  logout,
}: {
  initialMessages: any[];
  user: any;
  logout: () => void;
}) {
  const session = user.studentData?.currentSessionId;

  const sdkInitialMessages = useMemo(
    () => mongoToUIMessages(initialMessages),
    [initialMessages],
  );

  const runtime = useChatRuntime({
    messages: sdkInitialMessages,
  });

  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const lastSyncedLen = useRef(initialMessages.length);
  const latestMessages = useRef<any[]>(initialMessages);
  const syncTimer = useRef<NodeJS.Timeout | null>(null);

  const syncWithDB = useCallback(
    async (msgs: any[]) => {
      if (!user?.studentId || msgs.length === 0) return;
      setSyncStatus("syncing");
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: user.studentId,
            studentName: user.name,
            messages: msgs.map((m: any) => ({
              role: m.role,
              content: [{ type: "text", text: extractText(m) }],
            })),
            languageLevel: user.studentData?.frenchLevel ?? "A1",
            subject: session?.subject ?? "Général",
            topic: session?.title ?? "Discussion libre",
          }),
        });
        if (res.ok) {
          lastSyncedLen.current = msgs.length;
          setSyncStatus("success");
          setTimeout(() => setSyncStatus("idle"), 2000);
        } else {
          setSyncStatus("error");
        }
      } catch {
        setSyncStatus("error");
      }
    },
    [user, session],
  );

  const handleMessagesChange = useCallback(
    (msgs: any[]) => {
      latestMessages.current = msgs;

      if (
        msgs.length > initialMessages.length ||
        msgs.length > lastSyncedLen.current
      ) {
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => {
          syncWithDB(msgs);
        }, 1500);
      }
    },
    [initialMessages.length, syncWithDB],
  );

  useEffect(() => {
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, []);

  const handlePrint = () => {
    printPDF(latestMessages.current, {
      title: `Rapport - ${user.studentData?.firstName ?? ""} ${user.studentData?.lastName ?? ""}`,
      sessionTitle: session?.title,
      level: `FR ${user.studentData?.frenchLevel ?? "A1"} / Math ${user.studentData?.mathLevel ?? "6ème"}`,
    });
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-screen flex-col bg-white font-sans text-black">
        <header className="flex items-center justify-between border-b-4 border-black bg-yellow-400 p-5 shadow-md">
          <div className="flex items-center gap-5">
            <div className="text-5xl">🎓</div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">
                Bonjour {user.studentData?.firstName} !
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    syncStatus === "syncing"
                      ? "animate-pulse bg-blue-600"
                      : syncStatus === "success"
                        ? "bg-green-600"
                        : syncStatus === "error"
                          ? "bg-red-500"
                          : "bg-zinc-400"
                  }`}
                />
                <p className="text-sm font-bold uppercase">
                  {session?.title
                    ? `Session : ${session.title}`
                    : "Discussion libre"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="rounded-2xl bg-blue-600 px-6 py-3 text-base font-black text-white shadow transition hover:bg-blue-700"
            >
              📄 IMPRIMER
            </button>
            <button
              onClick={logout}
              className="rounded-2xl bg-black px-6 py-3 text-base font-black text-white shadow transition hover:bg-zinc-800"
            >
              QUITTER
            </button>
          </div>
        </header>

        <StudentChatInner
          user={user}
          session={session}
          onMessagesChange={handleMessagesChange}
        />
      </div>
    </AssistantRuntimeProvider>
  );
}

export default function StudentChat() {
  const { user, logout } = useAuth();
  const [initialMessages, setInitialMessages] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.studentId) return;
      try {
        const res = await fetch(
          `/api/threads?studentId=${user.studentId}&t=${Date.now()}`,
        );
        const data = await res.json();
        setInitialMessages(data?.[0]?.messages ?? []);
      } catch {
        setInitialMessages([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.studentId]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-2xl font-bold text-white">
        <div className="mr-4 h-12 w-12 animate-spin rounded-full border-t-4 border-blue-500" />
        Chargement...
      </div>
    );

  return (
    <StudentChatContent
      initialMessages={initialMessages ?? []}
      user={user}
      logout={logout}
    />
  );
}
