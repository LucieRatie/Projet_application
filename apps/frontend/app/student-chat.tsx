"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  useThread,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  MessageSquareHeart,
  Sparkles,
  Lightbulb,
  Languages,
  Brain,
  FileText,
  Printer,
  ChevronDown,
  BookOpenText,
  LogOut,
  Inbox,
} from "lucide-react";
import { toast, Toaster } from "sonner";

// Helper: extraire le texte brut d'un message (ThreadMessage ou MongoDB brut)
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

// Helper: convertir messages MongoDB en format UIMessage pour AI SDK v6
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

// PDF Printer
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
    toast.warning("Aucun message à exporter.");
    return;
  }
  const pw = window.open("", "_blank");
  if (!pw) {
    toast.error("Veuillez autoriser les popups pour imprimer.");
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

// StudentChatInner: runs INSIDE <AssistantRuntimeProvider> to access thread
function StudentChatInner({
  user,
  session,
  visibleDocuments,
  historyThreads,
  activeTab,
  setActiveTab,
  onMessagesChange,
  onSessionChange,
  activeResume,
  setActiveResume,
}: {
  user: any;
  session: any;
  visibleDocuments: any[];
  historyThreads: any[];
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onMessagesChange: (msgs: any[]) => void;
  onSessionChange: (id: string) => void;
  activeResume?: { topic: string; content: string } | null;
  setActiveResume?: (r: { topic: string; content: string } | null) => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(true);
  const [profilOpen, setProfilOpen] = useState(true);
  const messages = useThread((t) => t.messages);

  useEffect(() => {
    onMessagesChange(messages as any[]);
  }, [messages, onMessagesChange]);

  const NavButton = ({ active, onClick, icon, label }: any) => (
    <button
      onClick={onClick}
      className="group flex w-full flex-col items-center gap-1.5 py-1"
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
          active
            ? "bg-gradient-to-tr from-blue-500 to-emerald-500 text-white shadow-md shadow-blue-500/20"
            : "text-zinc-400 group-hover:bg-zinc-100 group-hover:text-zinc-600"
        }`}
      >
        {icon}
      </div>
      <span
        className={`text-[11px] font-medium ${active ? "text-zinc-800" : "text-zinc-400"}`}
      >
        {label}
      </span>
    </button>
  );

  return (
    <div className="flex flex-1 overflow-hidden bg-zinc-50">
      {/* 1. Global Navigation Bar (Leftmost) */}
      <aside className="flex w-20 flex-col items-center gap-6 border-r border-zinc-100 bg-white py-8">
        <NavButton
          active={activeTab === "chat"}
          onClick={() => setActiveTab("chat")}
          icon={<MessageSquareHeart size={20} />}
          label="Chat"
        />
        <NavButton
          active={activeTab === "vocabulaire"}
          onClick={() => setActiveTab("vocabulaire")}
          icon={<Languages size={20} />}
          label="Mots"
        />
        <NavButton
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
              className={`relative flex flex-col border-r border-zinc-100 bg-white transition-all duration-300 ${
                historyOpen ? "w-[260px]" : "w-0 overflow-hidden"
              }`}
            >
              <div className="flex h-full w-[260px] flex-col overflow-hidden">
                <div className="border-b border-zinc-100 px-5 py-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                    <Sparkles className="text-amber-500" size={16} />
                    Historique
                  </h2>
                </div>
                <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-3">
                  {(historyThreads || []).map((t: any) => {
                    const isSelected =
                      (session?.title || "Discussion libre") === t.topic;
                    return (
                      <button
                        key={t._id}
                        onClick={() => {
                          if (t.topic.startsWith("Résumé de ")) {
                            if (setActiveResume)
                              setActiveResume({
                                topic: t.topic,
                                content: extractText(t.messages[0]),
                              });
                            setActiveTab("resume-view");
                          } else if (t.topic === "Discussion libre") {
                            onSessionChange("free-discussion");
                            setActiveTab("chat");
                          } else {
                            const found = user.studentData?.sessionIds?.find(
                              (s: any) => s.title === t.topic,
                            );
                            if (found) {
                              onSessionChange(found._id);
                              setActiveTab("chat");
                            }
                          }
                        }}
                        className={`w-full rounded-xl border p-3.5 text-left transition-all ${
                          isSelected
                            ? "border-blue-200 bg-blue-50"
                            : "border-transparent hover:border-zinc-100 hover:bg-zinc-50"
                        }`}
                      >
                        <h3
                          className={`mb-1 truncate text-sm font-medium ${isSelected ? "text-blue-700" : "text-zinc-700"}`}
                        >
                          {t.topic}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-zinc-400">
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
                className="absolute top-1/2 left-0 z-40 flex h-12 w-6 -translate-y-1/2 items-center justify-center rounded-r-lg border border-zinc-200 bg-white text-zinc-400 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-600"
              >
                <ChevronDown
                  size={14}
                  className={`transition-transform ${historyOpen ? "rotate-90" : "-rotate-90"}`}
                />
              </button>

              {/* Profil Toggle Button */}
              <button
                onClick={() => setProfilOpen(!profilOpen)}
                className="absolute top-1/2 right-0 z-40 flex h-12 w-6 -translate-y-1/2 items-center justify-center rounded-l-lg border border-zinc-200 bg-white text-zinc-400 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-600"
              >
                <ChevronDown
                  size={14}
                  className={`transition-transform ${profilOpen ? "-rotate-90" : "rotate-90"}`}
                />
              </button>

              <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
                <div className="flex-1 overflow-hidden">
                  <Thread />
                </div>

                {/* Pedagogical Suggestions Bar */}
                <div className="flex flex-wrap justify-center gap-2 border-t border-zinc-100 bg-zinc-50/70 p-3">
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
                    icon={<Brain size={13} className="text-emerald-500" />}
                    prompt="Propose-moi un petit exercice pour vérifier que j'ai bien compris."
                  />
                </div>
              </div>
            </div>

            {/* Right Sidebar: Profil */}
            <aside
              className={`relative flex flex-col border-l border-zinc-100 bg-white transition-all duration-300 ${
                profilOpen ? "w-[300px]" : "w-0 overflow-hidden"
              }`}
            >
              <div className="custom-scrollbar flex h-full w-[300px] flex-col overflow-y-auto p-6">
                <div className="mb-6 flex items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 text-base font-semibold text-white">
                    {(user.studentData?.firstName?.[0] ?? "") +
                      (user.studentData?.lastName?.[0] ?? "")}
                  </div>
                  <div>
                    <p className="text-[11px] tracking-wide text-zinc-400 uppercase">
                      Profil élève
                    </p>
                    <div className="font-semibold text-zinc-800">
                      {user.studentData?.firstName} {user.studentData?.lastName}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-white">
                    <h3 className="mb-1.5 text-[11px] tracking-wide text-zinc-400 uppercase">
                      ID système
                    </h3>
                    <code className="text-lg font-semibold tracking-wide text-emerald-400">
                      {user.studentId}
                    </code>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3.5 text-center">
                      <div className="mb-1 text-[11px] text-blue-400">
                        Français
                      </div>
                      <div className="text-xl font-semibold text-blue-600">
                        {user.studentData?.frenchLevel}
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-3.5 text-center">
                      <div className="mb-1 text-[11px] text-amber-500">
                        Math
                      </div>
                      <div className="text-xl font-semibold text-amber-600">
                        {user.studentData?.mathLevel || "<6ème"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {activeTab === "resume-view" && activeResume && (
          <div className="custom-scrollbar h-full w-full flex-1 overflow-y-auto bg-zinc-50 p-4 md:p-8">
            <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm md:p-10">
              <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-zinc-800">
                <BookOpenText className="text-blue-500" />
                {activeResume.topic}
              </h2>
              <div className="prose prose-blue max-w-none rounded-xl bg-white/50 p-4 leading-relaxed text-zinc-700">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {activeResume.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        <div
          className={`custom-scrollbar h-full overflow-y-auto p-4 md:p-8 ${activeTab === "vocabulaire" ? "block" : "hidden"}`}
        >
          <GlossaryView session={session} user={user} />
        </div>

        {activeTab === "docs" && (
          <div className="custom-scrollbar h-full overflow-y-auto p-4 md:p-8">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold text-zinc-800 md:text-2xl">
              <BookOpenText size={22} className="text-blue-500" />
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
                    className="flex items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-4 transition-all hover:border-blue-200 hover:shadow-md hover:shadow-blue-50"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-zinc-700">
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
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 text-zinc-400">
                <Inbox size={36} className="opacity-50" />
                <p className="mt-3 text-sm font-medium">
                  Aucun document disponible pour votre cycle
                </p>
              </div>
            )}

            <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50 p-6">
              <h3 className="mb-2 font-semibold text-amber-800">
                🎯 Objectif pédagogique
              </h3>
              <p className="leading-relaxed text-amber-900/80">
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
  icon: React.ReactNode;
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

function GlossaryView({ session, user }: { session: any; user: any }) {
  const [glossary, setGlossary] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateGlossary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:5000/api/glossary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: user?.studentId,
          sessionId: session?._id,
          aiDocuments: session?.aiDocuments || [],
          frenchLevel: user?.studentData?.frenchLevel,
          nativeLanguage: user?.studentData?.nativeLanguage,
          topic: session?.title,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate glossary");
      setGlossary(data.glossary || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-zinc-100 bg-white p-6">
        <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold text-zinc-800">
          <Languages size={20} className="text-blue-500" />
          Vocabulaire bilingue
        </h2>
        <p className="mb-4 text-zinc-500">
          Générez une liste de mots clés tirés des documents de cette session,
          traduits en{" "}
          <strong className="font-medium text-zinc-700">
            {user?.studentData?.nativeLanguage || "votre langue"}
          </strong>
          .
        </p>
        <button
          onClick={generateGlossary}
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-40 disabled:shadow-none"
        >
          {loading ? "Génération en cours…" : "✨ Créer mon glossaire"}
        </button>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>

      {glossary.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {glossary.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 transition-colors hover:bg-blue-50"
            >
              <div className="mb-1.5 text-lg font-semibold text-blue-600">
                {item.motFr}
              </div>
              <div className="mb-2 text-xs font-medium text-zinc-400 uppercase">
                {user?.studentData?.nativeLanguage} :{" "}
                <span className="text-zinc-700 normal-case">
                  {item.traduction}
                </span>
              </div>
              <div className="text-sm text-zinc-600">{item.explication}</div>
            </div>
          ))}
        </div>
      )}
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
    "chat" | "docs" | "history" | "profil" | "vocabulaire" | "resume-view"
  >("chat");
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  const [localInitialMessages, setLocalInitialMessages] =
    useState<any[]>(initialMessages);
  const [activeResume, setActiveResume] = useState<{
    topic: string;
    content: string;
  } | null>(null);

  const sessions = useMemo(() => {
    return user.studentData?.sessionIds || [];
  }, [user.studentData?.sessionIds]);

  const session = useMemo(() => {
    return sessions.find((s: any) => s._id === activeSessionId) || sessions[0];
  }, [sessions, activeSessionId]);

  const [resumeLoading, setResumeLoading] = useState(false);

  useEffect(() => {
    setLocalInitialMessages(initialMessages);
  }, [initialMessages]);

  const generateResume = async () => {
    if (!session || session._id === "free-discussion") return;
    setResumeLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/chat/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionName: session.title,
          sessionGoal: session.objective,
          aiDocuments: session.aiDocuments || [],
          frenchLevel: user?.studentData?.frenchLevel,
          nativeLanguage: user?.studentData?.nativeLanguage,
        }),
      });
      const data = await res.json();
      if (data.message) {
        const title = `Résumé de ${session.title}`;
        await fetch("http://localhost:5000/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: user.studentId,
            studentName: user.name,
            messages: [
              {
                role: "assistant",
                content: [{ type: "text", text: data.message }],
              },
            ],
            languageLevel: user?.studentData?.frenchLevel ?? "A1",
            mathLevel: user?.studentData?.mathLevel ?? "<6ème",
            subject: session.subject ?? "Général",
            topic: title,
          }),
        });

        setActiveResume({ topic: title, content: data.message });
        setActiveTab("resume-view");
      }
    } catch (e) {
      console.error("Failed to generate resume:", e);
    } finally {
      setResumeLoading(false);
    }
  };

  // Student sees documents from the active session + personal documents
  const visibleDocuments = useMemo(() => {
    const sessionDocs = session?.exerciseDocuments || [];
    const personalDocs = user?.studentData?.personalDocuments || [];
    return [...sessionDocs, ...personalDocs];
  }, [session, user?.studentData?.personalDocuments]);

  const sdkInitialMessages = useMemo(
    () => mongoToUIMessages(localInitialMessages),
    [localInitialMessages],
  );

  const runtime = useChatRuntime({
    api: "/api/chat",
    body: {
      aiDocuments: session?.aiDocuments || [],
      studentId: user?.studentId,
      frenchLevel: user?.studentData?.frenchLevel,
      nativeLanguage: user?.studentData?.nativeLanguage,
      sessionName: session?.title,
      sessionGoal: session?.objective,
    },
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
        const res = await fetch("http://localhost:5000/api/sync", {
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
      <div className="flex h-screen flex-col bg-white font-sans text-zinc-900">
        <header className="flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-emerald-500 text-xl text-white md:h-12 md:w-12 md:text-2xl">
              👋
            </div>
            <div>
              <h1 className="text-base font-semibold text-zinc-800 md:text-xl">
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

                <div className="relative flex items-center gap-2">
                  <button
                    onClick={() => setShowSessionMenu(!showSessionMenu)}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-sm transition-colors hover:bg-zinc-50 md:px-3 md:py-1.5"
                  >
                    <span className="text-sm">
                      {session?._id === "free-discussion" ? "💬" : "📚"}
                    </span>
                    <span className="max-w-[110px] truncate font-medium text-zinc-600 md:max-w-none">
                      {session?.title}
                    </span>
                    <ChevronDown
                      size={13}
                      className={`text-zinc-400 transition-transform ${showSessionMenu ? "rotate-180" : ""}`}
                    />
                  </button>
                  {session?._id !== "free-discussion" && (
                    <button
                      onClick={generateResume}
                      disabled={resumeLoading}
                      className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100 disabled:opacity-50 md:px-3 md:py-1.5"
                    >
                      <span>📝</span>
                      {resumeLoading ? "Génération..." : "Résumé"}
                    </button>
                  )}

                  {showSessionMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowSessionMenu(false)}
                      />
                      <div className="absolute top-full left-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-xl shadow-zinc-200/50">
                        <div className="p-2">
                          <p className="mb-1.5 px-2.5 pt-1.5 text-[11px] tracking-wide text-zinc-400 uppercase">
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
                                className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors ${
                                  activeSessionId === s._id
                                    ? "bg-blue-50"
                                    : "hover:bg-zinc-50"
                                }`}
                              >
                                <span className="text-lg">
                                  {s._id === "free-discussion" ? "💬" : "📚"}
                                </span>
                                <div className="flex flex-col">
                                  <span
                                    className={`text-sm font-medium ${activeSessionId === s._id ? "text-blue-700" : "text-zinc-700"}`}
                                  >
                                    {s.title}
                                  </span>
                                  <span className="text-xs text-zinc-400">
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
          <div className="flex gap-2">
            {activeTab === "chat" && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 md:rounded-xl md:px-4 md:py-2.5 md:text-sm"
              >
                <Printer size={14} />
                <span className="hidden sm:inline">Imprimer</span>
              </button>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 md:rounded-xl md:px-4 md:py-2.5 md:text-sm"
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
          activeResume={activeResume}
          setActiveResume={setActiveResume}
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
          fetch(
            `http://localhost:5000/api/threads?studentId=${user.studentId}&t=${Date.now()}`,
          ),
          fetch(
            `http://localhost:5000/api/students/login?studentId=${user.studentId}&t=${Date.now()}`,
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
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white text-zinc-500">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-zinc-200 border-t-blue-500" />
        <p className="text-sm font-medium">Chargement…</p>
      </div>
    );

  return (
    <>
      <StudentChatContent
        key={activeSessionId || "default"}
        initialMessages={initialMessages ?? []}
        historyThreads={historyThreads}
        activeSessionId={activeSessionId}
        setActiveSessionId={handleSessionChange}
        user={{ ...user, studentData: currentUserData }}
        logout={logout}
      />
      <Toaster position="top-right" richColors />
    </>
  );
}
