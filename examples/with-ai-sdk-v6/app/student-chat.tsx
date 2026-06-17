"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  useThread,
  useAssistantInstructions,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  MessageSquareHeart,
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
  BookOpenText,
  CheckCircle2,
  FolderOpen,
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
  const messages = useThread((t) => t.messages);

  useEffect(() => {
    onMessagesChange(messages as any[]);
  }, [messages, onMessagesChange]);

  // Tells /api/chat which session this is and which uploaded PDFs to search
  // for relevant context (RAG) — the [[CONTEXT:...]] block is parsed and
  // stripped server-side before reaching the model.
  const systemInstruction = useMemo(() => {
    const objective =
      session?.objective ?? "Apprendre et progresser avec l'IA.";
    const documentUrls = (visibleDocuments || []).map((d: any) => d.url);
    return `${objective}\n\n[[CONTEXT:${JSON.stringify({ sessionId: session?._id, documentUrls })}]]`;
  }, [session, visibleDocuments]);

  useAssistantInstructions(systemInstruction);

  return (
    <div className="flex flex-1 overflow-hidden bg-zinc-50">
      {/* 1. Global Navigation Bar (Leftmost) */}
      <aside className="flex w-20 flex-col items-center gap-6 border-r border-zinc-200 bg-white py-8">
        <TabButton
          active={activeTab === "chat"}
          onClick={() => setActiveTab("chat")}
          icon={<MessageSquareHeart size={20} />}
          label="Chat"
        />
        <TabButton
          active={activeTab === "docs"}
          onClick={() => setActiveTab("docs")}
          icon={<BookOpenText size={20} />}
          label="Docs"
        />
      </aside>

      {/* 2. Main Content Area */}
      <main className="relative flex-1 overflow-hidden">
        {activeTab === "chat" && (
          <div className="flex h-full w-full overflow-hidden">
            {/* Left Sidebar: Historique */}
            <aside
              className={`relative flex flex-col border-r border-zinc-200 bg-white transition-all duration-300 ${
                historyOpen ? "w-64" : "w-0 overflow-hidden border-r-0"
              }`}
            >
              <div className="flex h-full w-64 flex-col overflow-hidden">
                <div className="flex items-center gap-2 border-b border-zinc-200 p-4">
                  <History size={16} className="text-zinc-400" />
                  <h2 className="text-xs font-bold tracking-widest text-zinc-500 uppercase">
                    Historique
                  </h2>
                </div>
                <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-3">
                  {(historyThreads || []).map((t: any) => {
                    const isSelected = session?._id === t.sessionId;
                    return (
                      <button
                        key={t._id}
                        onClick={() => onSessionChange(t.sessionId)}
                        className={`w-full rounded-xl border p-3 text-left transition-all ${
                          isSelected
                            ? "border-blue-400 bg-blue-50"
                            : "border-zinc-200 bg-white hover:bg-zinc-50"
                        }`}
                      >
                        <h3
                          className={`truncate text-sm font-semibold ${
                            isSelected ? "text-blue-700" : "text-zinc-800"
                          }`}
                        >
                          {t.topic}
                        </h3>
                        <div className="mt-1 flex items-center justify-between text-[10px] font-medium text-zinc-400">
                          <span>
                            {new Date(t.updatedAt).toLocaleDateString()}
                          </span>
                          <span>{t.messages?.length || 0} msg</span>
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
                className="absolute top-1/2 left-0 z-40 flex h-10 w-6 -translate-y-1/2 items-center justify-center rounded-r-lg border border-zinc-200 bg-white text-zinc-400 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-700"
              >
                {historyOpen ? (
                  <ChevronLeft size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>

              {/* Profil Toggle Button */}
              <button
                onClick={() => setProfilOpen(!profilOpen)}
                className="absolute top-1/2 right-0 z-40 flex h-10 w-6 -translate-y-1/2 items-center justify-center rounded-l-lg border border-zinc-200 bg-white text-zinc-400 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-700"
              >
                {profilOpen ? (
                  <ChevronRight size={14} />
                ) : (
                  <ChevronLeft size={14} />
                )}
              </button>

              <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
                <div className="flex-1 overflow-hidden">
                  <Thread />
                </div>

                {/* Pedagogical Suggestions Bar */}
                <div className="flex flex-wrap justify-center gap-2 border-t border-zinc-100 bg-zinc-50/60 p-3">
                  <SuggestionPill
                    label="Explique-moi plus simplement"
                    icon={<Lightbulb size={13} className="text-amber-500" />}
                    prompt="Peux-tu m'expliquer cela avec des mots plus simples et des exemples concrets ?"
                  />
                  <SuggestionPill
                    label="Traduis dans ma langue maternelle"
                    icon={<Languages size={13} className="text-blue-500" />}
                    prompt="Peux-tu me traduire ce que tu viens de dire dans ma langue maternelle ?"
                  />
                  <SuggestionPill
                    label="Donne-moi un exercice"
                    icon={<Brain size={13} className="text-purple-500" />}
                    prompt="Propose-moi un petit exercice pour vérifier que j'ai bien compris."
                  />
                </div>
              </div>
            </div>

            {/* Right Sidebar: Profil */}
            <aside
              className={`relative flex flex-col border-l border-zinc-200 bg-white transition-all duration-300 ${
                profilOpen ? "w-72" : "w-0 overflow-hidden border-l-0"
              }`}
            >
              <div className="custom-scrollbar flex h-full w-72 flex-col overflow-y-auto p-6">
                <div className="mb-6 flex items-center gap-2 text-zinc-400">
                  <User size={16} />
                  <h2 className="text-xs font-bold tracking-widest text-zinc-500 uppercase">
                    Profil étudiant
                  </h2>
                </div>
                <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-lg font-bold text-zinc-900">
                    {user.studentData?.firstName} {user.studentData?.lastName}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl bg-zinc-900 p-4 text-white">
                    <h3 className="mb-1 text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                      ID système
                    </h3>
                    <code className="text-base font-bold tracking-wide">
                      {user.studentId}
                    </code>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center">
                      <div className="mb-1 text-[10px] font-bold text-blue-600/70 uppercase">
                        Français
                      </div>
                      <div className="text-xl font-bold text-blue-700">
                        {user.studentData?.frenchLevel}
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
                      <div className="mb-1 text-[10px] font-bold text-amber-600/70 uppercase">
                        Math
                      </div>
                      <div className="text-xl font-bold text-amber-700">
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
          <div className="custom-scrollbar h-full overflow-y-auto p-6 md:p-10">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-zinc-900 md:text-xl">
              <BookOpenText size={20} className="text-zinc-400" />
              Documents de cours
              <span className="text-sm font-normal text-zinc-400">
                ({user.studentData?.mathLevel || "Général"})
              </span>
            </h2>
            {visibleDocuments.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {visibleDocuments.map((doc: any, idx: number) => (
                  <a
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-900">
                        {doc.name}
                      </div>
                      <div className="text-xs text-zinc-400">
                        Cliquer pour ouvrir
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 text-zinc-400">
                <FolderOpen size={36} className="opacity-40" />
                <p className="text-sm font-medium">
                  Aucun document disponible pour ce cycle
                </p>
              </div>
            )}

            <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-5">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900">
                <Lightbulb size={16} className="text-blue-500" />
                Objectif pédagogique
              </h3>
              <p className="text-sm leading-relaxed text-blue-800">
                {session?.objective ?? "Apprendre et progresser avec l'IA."}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SuggestionPill({
  label,
  icon,
  prompt,
}: {
  label: string;
  icon?: React.ReactNode;
  prompt: string;
}) {
  return (
    <ThreadPrimitive.Suggestion prompt={prompt} send asChild>
      <button className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
        {icon}
        {label}
      </button>
    </ThreadPrimitive.Suggestion>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-semibold transition-all ${
        active
          ? "bg-blue-50 text-blue-600"
          : "text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
      }`}
    >
      {icon}
      {label}
    </button>
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
  setActiveSessionId: (id: string | null) => void;
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
      objective: "Apprendre et progresser avec l'IA.",
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
            sessionId: activeSessionId ?? "free-discussion",
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
    [user, session, activeSessionId],
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

  const handleEndSession = async () => {
    if (
      !confirm(
        "Terminer cette session ? Tu pourras toujours revenir consulter l'historique.",
      )
    ) {
      return;
    }
    // Flush any pending sync so the last messages aren't lost before completion.
    if (syncTimer.current) clearTimeout(syncTimer.current);
    await syncWithDB(latestMessages.current);

    const thread = historyThreads.find(
      (t: any) => t.sessionId === activeSessionId,
    );
    if (thread?._id) {
      await fetch(`/api/threads/${thread._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
    }
    setActiveSessionId(null);
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-screen flex-col bg-white font-sans text-zinc-900">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 md:px-8">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-500 md:h-11 md:w-11">
              <GraduationCap size={20} className="md:size-6" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-900 md:text-lg">
                Bonjour {user.studentData?.firstName} !
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${
                    syncStatus === "syncing"
                      ? "animate-pulse bg-blue-500"
                      : syncStatus === "success"
                        ? "bg-emerald-500"
                        : syncStatus === "error"
                          ? "bg-red-500"
                          : "bg-zinc-300"
                  }`}
                />

                <div className="relative">
                  <button
                    onClick={() => setShowSessionMenu(!showSessionMenu)}
                    className="group flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-zinc-700 transition-all hover:bg-zinc-50 md:rounded-xl md:px-3 md:py-1.5"
                  >
                    <div className="flex flex-col items-start leading-none">
                      <span className="hidden text-[9px] font-medium text-zinc-400 md:block">
                        Session actuelle
                      </span>
                      <span className="max-w-[100px] truncate text-xs font-semibold md:max-w-none md:text-sm">
                        {session?.title}
                      </span>
                    </div>
                    <ChevronDown
                      size={13}
                      className={`text-zinc-400 transition-transform duration-200 ${showSessionMenu ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showSessionMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowSessionMenu(false)}
                      />
                      <div className="absolute top-full left-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                        <div className="p-2">
                          <p className="mb-1 px-2 py-1 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
                            Choisir votre session
                          </p>
                          <div className="space-y-0.5">
                            {sessions.map((s: any) => (
                              <button
                                key={s._id}
                                onClick={() => {
                                  setActiveSessionId(s._id);
                                  setShowSessionMenu(false);
                                }}
                                className={`flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-all ${
                                  activeSessionId === s._id
                                    ? "bg-blue-50 text-blue-700"
                                    : "hover:bg-zinc-50"
                                }`}
                              >
                                {s._id === "free-discussion" ? (
                                  <MessageSquareHeart
                                    size={16}
                                    className="text-zinc-400"
                                  />
                                ) : (
                                  <BookOpenText
                                    size={16}
                                    className="text-zinc-400"
                                  />
                                )}
                                <div className="flex flex-col">
                                  <span className="text-sm leading-none font-medium">
                                    {s.title}
                                  </span>
                                  <span className="text-[10px] text-zinc-400">
                                    {s.subject || "Général"}
                                  </span>
                                </div>
                                {activeSessionId === s._id && (
                                  <span className="ml-auto text-blue-500">
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
          <div className="flex gap-1.5 md:gap-2">
            {activeTab === "chat" && (
              <>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 md:rounded-xl md:px-4"
                >
                  <Printer size={14} />
                  <span className="hidden sm:inline">Imprimer</span>
                </button>
                <button
                  onClick={handleEndSession}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-600 hover:text-white md:rounded-xl md:px-4"
                >
                  <CheckCircle2 size={14} />
                  <span className="hidden sm:inline">Terminer</span>
                </button>
              </>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 md:rounded-xl md:px-4"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Quitter</span>
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

          const currentThread = threadData.find(
            (t: any) => t.sessionId === "free-discussion",
          );
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

  // When active session changes, update initial messages for that session.
  // Threads are looked up by sessionId (unique per session), never by topic
  // title, so switching sessions can't overwrite or lose another session's history.
  const handleSessionChange = useCallback(
    (sessionId: string | null) => {
      setActiveSessionId(sessionId);
      if (!sessionId) {
        setInitialMessages([]);
        return;
      }
      const thread = historyThreads.find((t: any) => t.sessionId === sessionId);
      setInitialMessages(thread?.messages ?? []);
    },
    [historyThreads],
  );

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 text-sm font-medium text-zinc-500">
        <div className="mr-3 h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-500" />
        Chargement...
      </div>
    );

  if (!activeSessionId) {
    return (
      <SessionSelectionDashboard
        user={{ ...user, studentData: currentUserData }}
        onSelect={handleSessionChange}
        logout={logout}
      />
    );
  }

  return (
    <StudentChatContent
      key={activeSessionId}
      initialMessages={initialMessages ?? []}
      historyThreads={historyThreads}
      activeSessionId={activeSessionId}
      setActiveSessionId={handleSessionChange}
      user={{ ...user, studentData: currentUserData }}
      logout={logout}
    />
  );
}

function SessionSelectionDashboard({
  user,
  onSelect,
  logout,
}: {
  user: any;
  onSelect: (sessionId: string) => void;
  logout: () => void;
}) {
  const sessions = [
    {
      _id: "free-discussion",
      title: "Discussion libre",
      subject: "Général",
    },
    ...(user.studentData?.sessionIds || []),
  ];

  return (
    <div className="flex h-screen flex-col bg-zinc-50 font-sans text-zinc-900">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 md:px-10">
        <h1 className="text-lg font-bold text-zinc-900 md:text-xl">
          Choisis ta session, {user.studentData?.firstName}
        </h1>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          <LogOut size={14} />
          Quitter
        </button>
      </header>
      <div className="custom-scrollbar flex-1 overflow-y-auto p-6 md:p-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s: any) => (
            <button
              key={s._id}
              onClick={() => onSelect(s._id)}
              className="flex flex-col items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                {s._id === "free-discussion" ? (
                  <MessageSquareHeart size={20} />
                ) : (
                  <BookOpenText size={20} />
                )}
              </div>
              <span className="text-base font-semibold text-zinc-900">
                {s.title}
              </span>
              <span className="text-xs font-medium text-zinc-400">
                {s.subject || "Général"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
