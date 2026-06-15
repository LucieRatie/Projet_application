"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider, useThread } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useRef, useState, useCallback } from "react";

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
  // useThread runs inside AssistantRuntimeProvider — correct context
  const messages = useThread((t) => t.messages);

  useEffect(() => {
    onMessagesChange(messages as any[]);
  }, [messages, onMessagesChange]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main Chat */}
      <main className="relative flex-1 overflow-hidden border-r-4 border-black">
        <Thread />
      </main>

      {/* Right Sidebar */}
      <aside className="flex w-80 flex-col gap-6 overflow-y-auto bg-zinc-50 p-6">
        <h2 className="border-b-4 border-black pb-2 text-xl font-black uppercase">
          Mes Progrès
        </h2>
        <SkillCard
          label="Vocabulaire"
          value={user.studentData?.skillsSummary?.vocabulary ?? 0}
          color="bg-blue-500"
        />
        <SkillCard
          label="Grammaire"
          value={user.studentData?.skillsSummary?.grammar ?? 0}
          color="bg-emerald-500"
        />
        <SkillCard
          label="Compréhension"
          value={user.studentData?.skillsSummary?.comprehension ?? 0}
          color="bg-purple-500"
        />
        <SkillCard
          label="Logique Math"
          value={user.studentData?.skillsSummary?.mathLogic ?? 0}
          color="bg-orange-500"
        />

        <div className="mt-auto rounded-xl border-2 border-yellow-400 bg-yellow-100 p-4">
          <p className="mb-1 text-xs font-bold tracking-widest text-yellow-800 uppercase">
            Objectif du jour :
          </p>
          <p className="text-base leading-tight font-medium">
            {session?.objective ?? "Apprendre et progresser avec l'IA."}
          </p>
        </div>
      </aside>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// StudentChatContent: setup runtime + sync DB
// ═══════════════════════════════════════════════════════════════════════════════
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

  // Map MongoDB → AI SDK v6 UIMessage
  const sdkInitialMessages = mongoToUIMessages(initialMessages);

  const runtime = useChatRuntime({
    messages: sdkInitialMessages,
  });

  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const lastSyncedLen = useRef(initialMessages.length);
  const [liveMessages, setLiveMessages] = useState<any[]>([]);

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
      setLiveMessages(msgs);
      if (msgs.length > lastSyncedLen.current) {
        setTimeout(() => syncWithDB(msgs), 1200);
      }
    },
    [syncWithDB],
  );

  const handlePrint = () => {
    printPDF(liveMessages, {
      title: `Rapport - ${user.studentData?.firstName ?? ""} ${user.studentData?.lastName ?? ""}`,
      sessionTitle: session?.title,
      level: `FR ${user.studentData?.frenchLevel ?? "A1"} / Math ${user.studentData?.mathLevel ?? "6ème"}`,
    });
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-screen flex-col bg-white font-sans text-black">
        {/* Header */}
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
                  {session ? `Session : ${session.title}` : "Discussion libre"}
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

        {/* Body */}
        <StudentChatInner
          user={user}
          session={session}
          onMessagesChange={handleMessagesChange}
        />
      </div>
    </AssistantRuntimeProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page loader – charge l'historique MongoDB avant de monter le runtime
// ═══════════════════════════════════════════════════════════════════════════════
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

function SkillCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-black uppercase">{label}</span>
        <span className="text-xl font-black">{value}%</span>
      </div>
      <div className="h-5 w-full overflow-hidden rounded-full border-2 border-black bg-zinc-200">
        <div
          className={`h-full ${color} transition-all duration-1000`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
