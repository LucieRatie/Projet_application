"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  useThread,
  SuggestionPrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  MessageCircle,
  BookOpen,
  History,
  User,
  GraduationCap,
  Lightbulb,
  Languages,
  Brain,
  ChevronLeft,
  ChevronRight,
  FileText,
  LogOut,
  Printer,
  ChevronDown,
} from "lucide-react";

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
  meta: {
    title: string;
    sessionTitle?: string;
    level?: string;
    mathLevel?: string;
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
    Session : ${meta.sessionTitle ?? "Discussion libre"}<br/>
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

// ═══════════════════════════════════════════════════════════════════════════════
// StudentChatInner: runs INSIDE <AssistantRuntimeProvider> to access thread
// ═══════════════════════════════════════════════════════════════════════════════
function StudentChatInner({
  user,
  session,
  visibleDocuments,
  historyThreads,
  activeTab,
  setActiveTab,
  onMessagesChange,
  onSessionChange,
}: {
  user: any;
  session: any;
  visibleDocuments: any[];
  historyThreads: any[];
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onMessagesChange: (msgs: any[]) => void;
  onSessionChange: (id: string) => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(true);
  const [profilOpen, setProfilOpen] = useState(true);
  const [historyWidth, setHistoryWidth] = useState(280);
  const [profilWidth, setProfilWidth] = useState(320);
  const messages = useThread((t) => t.messages);

  useEffect(() => {
    onMessagesChange(messages as any[]);
  }, [messages, onMessagesChange]);

  return (
    <div className="flex flex-1 overflow-hidden bg-[#F4F4F5]">
      {/* 1. Global Navigation Bar (Leftmost) */}
      <aside className="flex w-22 flex-col items-center gap-10 border-r-[5px] border-black bg-zinc-900 py-10 shadow-[5px_0px_0px_0px_rgba(0,0,0,0.1)]">
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
      </aside>

      {/* 2. Main Content Area */}
      <main className="relative flex-1 overflow-hidden">
        {activeTab === "chat" && (
          <div className="flex h-full w-full overflow-hidden">
            {/* Left Sidebar: Historique */}
            <aside
              className={`cubic-bezier(0.4, 0, 0.2, 1) relative flex flex-col border-r-[5px] border-black bg-white transition-all duration-500 ${
                historyOpen ? "" : "w-0 overflow-hidden border-r-0"
              }`}
              style={{ width: historyOpen ? historyWidth : 0 }}
            >
              <div className="flex h-full w-[280px] flex-col overflow-hidden">
                <div className="border-b-[5px] border-black bg-[#FFD600] p-5 shadow-sm">
                  <h2 className="flex items-center gap-2 text-sm font-black tracking-widest text-black uppercase">
                    <span className="text-lg">📜</span> Historique
                  </h2>
                </div>
                <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto bg-zinc-50/50 p-5">
                  {(historyThreads || []).map((t: any) => {
                    const isSelected =
                      (session?.title || "Discussion libre") === t.topic;
                    return (
                      <button
                        key={t._id}
                        onClick={() => {
                          if (t.topic === "Discussion libre") {
                            onSessionChange("free-discussion");
                          } else {
                            const found = user.studentData?.sessionIds?.find(
                              (s: any) => s.title === t.topic,
                            );
                            if (found) onSessionChange(found._id);
                          }
                        }}
                        className={`group w-full rounded-2xl border-[3px] border-black p-4 text-left shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                          isSelected ? "bg-[#FFD600]" : "bg-white"
                        }`}
                      >
                        <h3 className="mb-1 truncate text-[11px] font-black uppercase">
                          {t.topic}
                        </h3>
                        <div className="flex items-center justify-between opacity-70">
                          <span className="text-[9px] font-bold">
                            {new Date(t.updatedAt).toLocaleDateString()}
                          </span>
                          <span className="text-[9px] font-black uppercase">
                            {t.messages?.length || 0} msg
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Middle: Chat Frame */}
            <div className="relative flex flex-1 flex-col overflow-hidden bg-white">
              {/* History Toggle Button */}
              <button
                onClick={() => setHistoryOpen(!historyOpen)}
                className="absolute top-1/2 left-0 z-40 flex h-14 w-8 -translate-y-1/2 items-center justify-center rounded-r-xl border-[3px] border-l-0 border-black bg-[#FFD600] text-sm font-black shadow-[3px_0px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#FFEB3B] active:scale-95"
              >
                {historyOpen ? "◀" : "▶"}
              </button>

              {/* Profil Toggle Button */}
              <button
                onClick={() => setProfilOpen(!profilOpen)}
                className="absolute top-1/2 right-0 z-40 flex h-14 w-8 -translate-y-1/2 items-center justify-center rounded-l-xl border-[3px] border-r-0 border-black bg-[#FFD600] text-sm font-black shadow-[-3px_0px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#FFEB3B] active:scale-95"
              >
                {profilOpen ? "▶" : "◀"}
              </button>

              <div className="mx-auto flex h-full w-full max-w-4xl flex-col border-x border-zinc-200">
                <div className="flex-1 overflow-hidden">
                  <Thread />
                </div>

                {/* Pedagogical Suggestions Bar */}
                <div className="flex flex-wrap justify-center gap-2 border-t border-zinc-100 bg-zinc-50/50 p-3">
                  <SuggestionPill
                    label="Explique-moi plus simplement"
                    icon={
                      <Lightbulb
                        size={14}
                        strokeWidth={3}
                        className="text-yellow-600"
                      />
                    }
                    prompt="Peux-tu m'expliquer cela avec des mots plus simples et des exemples concrets ?"
                  />
                  <SuggestionPill
                    label="Traduis dans ma langue maternelle"
                    icon={
                      <Languages
                        size={14}
                        strokeWidth={3}
                        className="text-blue-600"
                      />
                    }
                    prompt="Peux-tu me traduire ce que tu viens de dire dans ma langue maternelle ?"
                  />
                  <SuggestionPill
                    label="Donne-moi un exercice"
                    icon={
                      <Brain
                        size={14}
                        strokeWidth={3}
                        className="text-purple-600"
                      />
                    }
                    prompt="Propose-moi un petit exercice pour vérifier que j'ai bien compris."
                  />
                </div>
              </div>
            </div>

            {/* Right Sidebar: Profil */}
            <aside
              className={`cubic-bezier(0.4, 0, 0.2, 1) relative flex flex-col border-l-[5px] border-black bg-white transition-all duration-500 ${
                profilOpen ? "" : "w-0 overflow-hidden border-l-0"
              }`}
              style={{ width: profilOpen ? profilWidth : 0 }}
            >
              <div className="custom-scrollbar flex h-full w-[320px] flex-col overflow-y-auto p-8">
                <div className="mb-8 rounded-3xl border-[4px] border-black bg-zinc-50 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                  <h2 className="mb-2 text-xs font-black tracking-widest text-zinc-500 uppercase">
                    👤 Profil Étudiant
                  </h2>
                  <div className="text-xl leading-tight font-black text-black uppercase">
                    {user.studentData?.firstName} {user.studentData?.lastName}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="rounded-3xl border-[4px] border-black bg-zinc-900 p-6 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]">
                    <h3 className="mb-2 text-[10px] font-black tracking-widest text-zinc-400 uppercase">
                      ID Système
                    </h3>
                    <code className="text-2xl font-black tracking-widest text-[#FFD600]">
                      {user.studentId}
                    </code>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border-[4px] border-black bg-[#E3F2FD] p-4 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <div className="mb-1 text-[10px] font-black text-blue-800/60 uppercase">
                        Français
                      </div>
                      <div className="text-2xl font-black text-blue-600">
                        {user.studentData?.frenchLevel}
                      </div>
                    </div>
                    <div className="rounded-2xl border-[4px] border-black bg-[#FFF8E1] p-4 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <div className="mb-1 text-[10px] font-black text-amber-800/60 uppercase">
                        Math
                      </div>
                      <div className="text-2xl font-black text-amber-600">
                        {user.studentData?.mathLevel || "<6ème"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {activeTab === "docs" && (
          <div className="custom-scrollbar h-full overflow-y-auto p-4 md:p-8">
            <h2 className="mb-6 text-xl font-black tracking-tighter uppercase md:text-3xl">
              📚 Documents de cours ({user.studentData?.mathLevel || "Général"})
            </h2>
            {visibleDocuments.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {visibleDocuments.map((doc: any, idx: number) => (
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
                  Aucun document disponible pour votre cycle
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
      </main>
    </div>
  );
}

function CompactSkillBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-black uppercase">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full border-2 border-black bg-zinc-100">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function SuggestionPill({ label, prompt }: { label: string; prompt: string }) {
  return (
    <ThreadPrimitive.Suggestion prompt={prompt} send asChild>
      <button className="rounded-full border-2 border-black bg-white px-4 py-1.5 text-xs font-black transition-all hover:-translate-y-0.5 hover:bg-[#FFD600] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none">
        {label}
      </button>
    </ThreadPrimitive.Suggestion>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 transition-all hover:scale-110 md:gap-1 ${active ? "text-yellow-400" : "text-zinc-500 hover:text-white"}`}
    >
      <span className="text-xl md:text-3xl">{icon}</span>
      <span className="text-[8px] font-black tracking-tighter uppercase md:text-[10px]">
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
  historyThreads,
  activeSessionId,
  setActiveSessionId,
  user,
  logout,
}: {
  initialMessages: any[];
  historyThreads: any[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string) => void;
  user: any;
  logout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "chat" | "docs" | "history" | "profil"
  >("chat");
  const [showSessionMenu, setShowSessionMenu] = useState(false);

  const sessions = useMemo(() => {
    const assigned = user.studentData?.sessionIds || [];
    // Always include a virtual "Discussion libre" session
    const freeDiscussion = {
      _id: "free-discussion",
      title: "Discussion libre",
      objective: "Apprendre et progresser với l'IA.",
      documents: [],
      subject: "Général",
    };
    return [freeDiscussion, ...assigned];
  }, [user.studentData?.sessionIds]);

  const session = useMemo(() => {
    return sessions.find((s: any) => s._id === activeSessionId) || sessions[0];
  }, [sessions, activeSessionId]);

  // Student sees documents from the active session
  const visibleDocuments = useMemo(() => {
    return session?.documents || [];
  }, [session]);

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
            mathLevel: user.studentData?.mathLevel ?? "<6ème",
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
      const prevMsgs = latestMessages.current;
      latestMessages.current = msgs;

      // Sync if length changed OR if content of last message changed (for streaming)
      const contentChanged =
        prevMsgs.length > 0 &&
        msgs.length > 0 &&
        extractText(msgs[msgs.length - 1]) !==
          extractText(prevMsgs[prevMsgs.length - 1]);

      if (
        msgs.length > initialMessages.length ||
        msgs.length > lastSyncedLen.current ||
        contentChanged
      ) {
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => {
          syncWithDB(msgs);
        }, 3000); // reduced from 30s to 3s for better sync
      }
    },
    [initialMessages.length, syncWithDB],
  );

  // Heartbeat to update lastActive even if no messages are sent
  useEffect(() => {
    const heartbeat = setInterval(() => {
      syncWithDB(latestMessages.current);
    }, 60000); // Heartbeat every 1 minute
    return () => clearInterval(heartbeat);
  }, [syncWithDB]);

  useEffect(() => {
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, []);

  const handlePrint = () => {
    printPDF(latestMessages.current, {
      title: `Rapport - ${user.studentData?.firstName ?? ""} ${user.studentData?.lastName ?? ""}`,
      sessionTitle: session?.title,
      level: `FR ${user.studentData?.frenchLevel ?? "A1"}`,
      mathLevel: user.studentData?.mathLevel,
    });
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-screen flex-col bg-white font-sans text-black">
        <header className="flex items-center justify-between border-b-4 border-black bg-yellow-400 p-3 shadow-md md:p-5">
          <div className="flex items-center gap-3 md:gap-5">
            <div className="text-3xl md:text-5xl">🎓</div>
            <div>
              <h1 className="text-base font-black tracking-tight uppercase md:text-2xl">
                Bonjour {user.studentData?.firstName} !
              </h1>
              <div className="mt-1 flex items-center gap-2 md:mt-2 md:gap-3">
                <div
                  className={`h-2 w-2 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.3)] md:h-2.5 md:w-2.5 ${
                    syncStatus === "syncing"
                      ? "animate-pulse bg-blue-500"
                      : syncStatus === "success"
                        ? "bg-green-500"
                        : syncStatus === "error"
                          ? "bg-red-500"
                          : "bg-zinc-600"
                  }`}
                />

                <div className="relative">
                  <button
                    onClick={() => setShowSessionMenu(!showSessionMenu)}
                    className="group flex items-center gap-2 rounded-lg border-2 border-black bg-white px-2 py-1 transition-all hover:bg-zinc-50 active:translate-y-0.5 md:gap-3 md:rounded-xl md:px-4 md:py-2"
                  >
                    <span className="text-sm md:text-lg">
                      {session?._id === "free-discussion" ? "💬" : "🏫"}
                    </span>
                    <div className="flex flex-col items-start leading-none md:leading-tight">
                      <span className="hidden text-[8px] font-black tracking-widest text-zinc-400 uppercase md:block md:text-[10px]">
                        Mode actuel
                      </span>
                      <span className="max-w-[80px] truncate text-[10px] font-black tracking-tight uppercase md:max-w-none md:text-sm">
                        {session?.title}
                      </span>
                    </div>
                    <span
                      className={`ml-1 text-[8px] transition-transform duration-300 md:ml-2 md:text-xs ${showSessionMenu ? "rotate-180" : ""}`}
                    >
                      ▼
                    </span>
                  </button>

                  {showSessionMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowSessionMenu(false)}
                      />
                      <div className="animate-in fade-in slide-in-from-top-2 absolute top-full left-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] duration-200">
                        <div className="p-3">
                          <p className="mb-2 px-2 text-[9px] font-black tracking-widest text-zinc-400 uppercase">
                            Choisir votre session
                          </p>
                          <div className="space-y-1">
                            {sessions.map((s: any) => (
                              <button
                                key={s._id}
                                onClick={() => {
                                  setActiveSessionId(s._id);
                                  setShowSessionMenu(false);
                                }}
                                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                                  activeSessionId === s._id
                                    ? "bg-zinc-900 text-white"
                                    : "hover:bg-zinc-100"
                                }`}
                              >
                                <span className="text-xl">
                                  {s._id === "free-discussion" ? "💬" : "📚"}
                                </span>
                                <div className="flex flex-col">
                                  <span className="text-xs leading-none font-black uppercase">
                                    {s.title}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold ${activeSessionId === s._id ? "text-zinc-400" : "text-zinc-500"}`}
                                  >
                                    {s.subject || "Général"}
                                  </span>
                                </div>
                                {activeSessionId === s._id && (
                                  <span className="ml-auto font-black text-blue-400">
                                    ✓
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 md:gap-3">
            {activeTab === "chat" && (
              <button
                onClick={handlePrint}
                className="rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-black text-white shadow transition hover:bg-blue-700 md:rounded-2xl md:px-6 md:py-3 md:text-base"
              >
                📄 IMPRIMER
              </button>
            )}
            <button
              onClick={logout}
              className="rounded-lg bg-black px-3 py-2 text-[10px] font-black text-white shadow transition hover:bg-zinc-800 md:rounded-2xl md:px-6 md:py-3 md:text-base"
            >
              QUITTER
            </button>
          </div>
        </header>

        <StudentChatInner
          user={user}
          session={session}
          visibleDocuments={visibleDocuments}
          historyThreads={historyThreads}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onMessagesChange={handleMessagesChange}
          onSessionChange={setActiveSessionId}
        />
      </div>
    </AssistantRuntimeProvider>
  );
}

export default function StudentChat() {
  const { user, logout } = useAuth();
  const [initialMessages, setInitialMessages] = useState<any[] | null>(null);
  const [historyThreads, setHistoryThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserData, setCurrentUserData] = useState<any>(
    user?.studentData,
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    const load = async (isFirstLoad = false) => {
      if (!user?.studentId) return;
      try {
        const [threadRes, studentRes] = await Promise.all([
          fetch(`/api/threads?studentId=${user.studentId}&t=${Date.now()}`),
          fetch(
            `/api/students/login?studentId=${user.studentId}&t=${Date.now()}`,
          ),
        ]);
        const threadData = await threadRes.json();
        const studentData = await studentRes.json();

        if (isFirstLoad) {
          // Free discussion is always first and default
          setActiveSessionId("free-discussion");

          const currentThread =
            threadData.find((t: any) => t.topic === "Discussion libre") ||
            threadData[0];
          setInitialMessages(currentThread?.messages ?? []);
        }

        setHistoryThreads(threadData);
        setCurrentUserData(studentData);
      } catch (err) {
        console.error("Error loading student data:", err);
        if (isFirstLoad) setInitialMessages([]);
      } finally {
        if (isFirstLoad) setLoading(false);
      }
    };

    load(true);

    // Refresh student data every 5 seconds to detect new session assignments/docs
    const interval = setInterval(() => load(false), 5000);
    return () => clearInterval(interval);
  }, [user?.studentId]);

  // When active session changes, update initial messages for that session
  const handleSessionChange = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId);
      let topic = "Discussion libre";
      if (sessionId !== "free-discussion") {
        const session = currentUserData?.sessionIds?.find(
          (s: any) => s._id === sessionId,
        );
        topic = session?.title || "Discussion libre";
      }
      const thread = historyThreads.find((t: any) => t.topic === topic);
      setInitialMessages(thread?.messages ?? []);
    },
    [currentUserData, historyThreads],
  );

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-2xl font-bold text-white">
        <div className="mr-4 h-12 w-12 animate-spin rounded-full border-t-4 border-blue-500" />
        Chargement...
      </div>
    );

  return (
    <StudentChatContent
      key={activeSessionId || "default"}
      initialMessages={initialMessages ?? []}
      historyThreads={historyThreads}
      activeSessionId={activeSessionId}
      setActiveSessionId={handleSessionChange}
      user={{ ...user, studentData: currentUserData }}
      logout={logout}
    />
  );
}
