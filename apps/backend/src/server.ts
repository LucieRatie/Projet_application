import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { google } from "@ai-sdk/google";
import multer from "multer";

import fs from "fs";
import path from "path";
import {
  streamText,
  generateText,
  convertToModelMessages,
  generateObject,
} from "ai";
import { z } from "zod";
import { createOllama } from "ai-sdk-ollama";
import dbConnect from "./lib/db";
import { Thread } from "./models/Thread";
import { Student } from "./models/Student";
import { Session } from "./models/Session";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.use(
  "/uploads",
  express.static(path.join(__dirname, "../../../langchain_python/RAG_src")),
);

const upload = multer({ storage: multer.memoryStorage() });

const pdfParseModule = require("pdf-parse");
async function parsePdfText(buffer: Buffer) {
  const parser = new pdfParseModule.PDFParse(new Uint8Array(buffer));
  await parser.load();
  const data = await parser.getText();
  return data.text;
}

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3.5:9b";
const ONLINE_MODE = process.env.ONLINE_MODE === "true";

const ollama = createOllama({
  baseURL: OLLAMA_URL,
});

// Connect to MongoDB
dbConnect()
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(port, () => {
      console.log(`Backend server running on http://localhost:${port}`);
    });
  })
  .catch(console.error);

// -----------------------------
// CHAT API
// -----------------------------
app.post("/api/chat", async (req, res) => {
  try {
    const rawMessages = req.body.messages ?? [];

    // Convert UI messages to core messages manually to avoid ai sdk bugs with missing parts
    const coreMessages = rawMessages.map((msg: any) => {
      let textContent = "";
      if (typeof msg.content === "string") {
        textContent = msg.content;
      } else if (Array.isArray(msg.content)) {
        textContent = msg.content
          .filter((p: any) => p.type === "text")
          .map((p: any) => p.text)
          .join("");
      } else if (Array.isArray(msg.parts)) {
        textContent = msg.parts
          .filter((p: any) => p.type === "text")
          .map((p: any) => p.text)
          .join("");
      }
      return {
        role:
          msg.role === "system"
            ? "system"
            : msg.role === "user"
              ? "user"
              : "assistant",
        content: textContent || " ",
      };
    });

    // Mock mode
    if (OLLAMA_URL === "mock") {
      const mockModel = {
        specificationVersion: "v2" as const,
        provider: "mock-provider",
        modelId: "mock-dram-ai",
        defaultObjectGenerationMode: undefined,
        doGenerate: async () => ({
          text: "Test",
          finishReason: "stop" as const,
          usage: { promptTokens: 0, completionTokens: 0 },
          rawCall: { rawPrompt: null, rawSettings: {} },
        }),
        doStream: async () => ({
          stream: new ReadableStream({
            start(controller) {
              const responseText =
                "Bonjour ! Je suis l'assistant pédagogique DRAM. Comment puis-je vous aider aujourd'hui ?";
              controller.enqueue({
                type: "text-delta",
                textDelta: responseText,
              });
              controller.close();
            },
          }),
          rawCall: { rawPrompt: null, rawSettings: {} },
        }),
      };

      const result = streamText({
        model: mockModel as any,
        messages: coreMessages,
      });

      return result.pipeDataStreamToResponse(res);
    }

    // Extract request body parameters safely
    let {
      aiDocuments = [],
      frenchLevel,
      nativeLanguage,
      sessionName,
      sessionGoal,
    } = req.body;
    const sessionId = req.body.sessionId || req.query.sessionId;

    // Fallback: if sessionName is missing but sessionId is present, look up the session from DB
    if (!sessionName && sessionId) {
      try {
        const sessionDoc = await Session.findById(sessionId);
        if (sessionDoc) {
          sessionName = sessionDoc.title;
          sessionGoal = sessionGoal || sessionDoc.objective;
          if (aiDocuments.length === 0 && sessionDoc.aiDocuments?.length > 0) {
            aiDocuments = sessionDoc.aiDocuments;
          }
        }
      } catch (err) {
        console.warn("Could not look up session by ID:", err);
      }
    }

    console.log("Chat Request Body:", {
      sessionName,
      sessionGoal,
      sessionId,
      frenchLevel,
    });

    // Requête au serveur RAG pour obtenir du contexte pertinent
    let ragContext = "";
    try {
      const lastMsg = coreMessages[coreMessages.length - 1];
      let lastUserMsgText = "";
      if (lastMsg && lastMsg.role === "user") {
        lastUserMsgText =
          typeof lastMsg.content === "string"
            ? lastMsg.content
            : Array.isArray(lastMsg.content)
              ? lastMsg.content
                  .filter((p) => p.type === "text")
                  .map((p) => (p as any).text)
                  .join(" ")
              : "";
      }

      const sources = aiDocuments.map((doc: any) => doc.name).join(",");

      // Enrich RAG query with session context for generic prompts (exercises, explanations)
      let ragQuery = lastUserMsgText;
      if (sessionName && lastUserMsgText) {
        ragQuery = `${sessionName} ${sessionGoal || ""} ${lastUserMsgText}`;
      }

      if (ragQuery && aiDocuments.length > 0) {
        let ragUrl = `http://localhost:8000/search?q=${encodeURIComponent(ragQuery)}`;
        if (sources) {
          ragUrl += `&sources=${encodeURIComponent(sources)}`;
        }
        const ragRes = await fetch(ragUrl);
        if (ragRes.ok) {
          const data = await ragRes.json();
          ragContext = data.context;
        }
      }
    } catch (err) {
      console.warn("Impossible de joindre le serveur RAG", err);
    }

    let docContext = "";
    if (ragContext) {
      docContext = `\nINFORMATIONS ISSUES DE LA BASE DE CONNAISSANCES (RAG) :\n${ragContext}\n--------------------\n`;
    }

    const systemPrompt = `Tu es Charles, un assistant de soutien scolaire bienveillant chargé de répondre aux questions d'un élève.

=== CONTRAINTE ABSOLUE (NE JAMAIS IGNORER) ===
Tu es EXCLUSIVEMENT un tuteur pour le sujet "${sessionName || "ce cours"}".
TOUS tes exercices, exemples, explications et réponses doivent porter UNIQUEMENT sur le sujet "${sessionName || "ce cours"}" avec l'objectif "${sessionGoal || "Apprentissage libre"}".
Si l'élève demande un exercice, une explication ou un exemple, base-toi sur le sujet et l'objectif de la session${ragContext ? ", ainsi que sur les documents fournis" : ""}. Ne génère JAMAIS de contenu sur un autre sujet, même si l'élève le demande.
=== FIN CONTRAINTE ABSOLUE ===

CONTEXTE DE LA SESSION :
- Sujet du cours : ${sessionName || "ce cours"}
- Objectif de la session : ${sessionGoal || "Apprentissage libre"}

INFORMATIONS SUR L'ÉLÈVE :
- Niveau de français (CECRL) : ${req.body.frenchLevel || "Inconnu"}
- Langue maternelle : ${req.body.nativeLanguage || "Anglais"}

RÈGLES D'ADAPTATION (TRÈS IMPORTANT) :
- Adapte ton vocabulaire et la complexité de tes phrases strictement au niveau de français de l'élève (${req.body.frenchLevel || "Inconnu"}). Si le niveau est A1/A2, utilise des phrases extrêmement simples, courtes, et des mots basiques.
- Si pertinent pour expliquer un concept difficile, tu peux faire un parallèle ou donner une traduction ponctuelle dans la langue maternelle de l'élève (${req.body.nativeLanguage || "Anglais"}).

CONSIGNES STRICTES :
1. Tu DOIS IMPÉRATIVEMENT refuser de répondre si la question n'est pas liée au sujet "${sessionName || "ce cours"}". Dis simplement que tu ne peux répondre qu'aux questions liées au cours "${sessionName || "ce cours"}".
2. Sois concis et direct. Ne t'éparpille pas dans des explications inutiles ou du bavardage.
3. Si des documents RAG sont fournis ci-dessous, utilise-les comme source principale. Sinon, utilise tes connaissances générales sur le sujet "${sessionName || "ce cours"}" et l'objectif "${sessionGoal || "Apprentissage libre"}" pour répondre, créer des exercices et des explications.
4. Rappelle-toi de l'historique de la conversation pour comprendre le contexte des questions.
5. Quand l'élève demande un exercice, crée un exercice EXCLUSIVEMENT sur le sujet "${sessionName || "ce cours"}" (objectif : "${sessionGoal || "Apprentissage libre"}"). Ne propose JAMAIS un exercice sur un sujet différent.
6. UTILISE STRICTEMENT LE FORMAT LATEX (entre $...$ ou $$...$$) pour TOUTES les formules mathématiques (notamment les fractions, ex: $\\frac{a}{b}$).
${docContext}`;

    const result = streamText({
      model: ONLINE_MODE
        ? google("gemini-3.1-flash-lite")
        : ollama(OLLAMA_MODEL),
      messages: coreMessages,
      system: systemPrompt,
    });

    result.pipeUIMessageStreamToResponse(res);
  } catch (error: any) {
    console.error("Chat Error:", error);
    res.status(500).json({
      error: "Internal Error",
      details: error?.stack || String(error),
    });
  }
});

// -----------------------------
// WELCOME SUMMARY API
// -----------------------------
app.post("/api/chat/welcome", async (req, res) => {
  try {
    const {
      sessionName,
      sessionGoal,
      aiDocuments = [],
      frenchLevel,
      nativeLanguage,
    } = req.body;

    let combinedText = "";
    if (aiDocuments.length > 0) {
      const ragSrcPath = path.join(
        __dirname,
        "../../../langchain_python/RAG_src",
      );
      for (const doc of aiDocuments) {
        const filePath = path.join(ragSrcPath, doc.name);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          if (filePath.toLowerCase().endsWith(".pdf")) {
            const pdfText = await parsePdfText(fileBuffer);
            combinedText += `\n--- Document: ${doc.name} ---\n${pdfText.substring(0, 5000)}\n`; // Limit text size
          } else {
            combinedText += `\n--- Document: ${doc.name} ---\n${fileBuffer.toString("utf-8").substring(0, 5000)}\n`;
          }
        }
      }
    }

    const systemPrompt = `Tu es Charles, un assistant de soutien scolaire bienveillant. 
L'élève vient de se connecter pour la session "${sessionName || "Étude"}" avec l'objectif "${sessionGoal || "Apprendre"}".
Niveau de français de l'élève (CECRL) : ${frenchLevel || "Inconnu"}
Langue maternelle : ${nativeLanguage || "Anglais"}

CONSIGNES STRICTES :
1. Adapte ton vocabulaire strictement au niveau de français de l'élève (${frenchLevel || "Inconnu"}).
2. Rédige un message de bienvenue chaleureux.
3. Rédige un résumé du contenu à apprendre.
4. Liste les formules ou concepts clés à retenir. UTILISE STRICTEMENT LE FORMAT LATEX (entre $...$ ou $$...$$) pour TOUTES les formules mathématiques (notamment les fractions, ex: $\frac{a}{b}$).
5. Donne quelques exercices d'exemple simples. UTILISE STRICTEMENT LE FORMAT LATEX pour les équations et fractions.
6. Termine en demandant s'il a besoin d'aide.
7. Base-toi sur les informations des documents fournis s'il y en a. Sinon, base-toi sur le nom de la session et son objectif.

DOCUMENTS :
${combinedText || "Aucun document fourni. Utilise l'objectif de la session."}`;

    const { text } = await generateText({
      model: ONLINE_MODE
        ? google("gemini-3.1-flash-lite")
        : ollama(OLLAMA_MODEL),
      prompt:
        "Génère le message de bienvenue avec le résumé, les formules et les exercices.",
      system: systemPrompt,
    });

    res.json({ message: text });
  } catch (error: any) {
    console.error("Welcome API error:", error);
    res.status(500).json({ error: "Failed to generate welcome summary" });
  }
});

// -----------------------------
// EVALUATE API
// -----------------------------
app.post("/api/evaluate", async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId)
      return res.status(400).json({ error: "ID de l'élève manquant" });

    const threads = await Thread.find({ studentId }).sort({ updatedAt: -1 });
    if (!threads || threads.length === 0) {
      return res.json({
        evaluation: "Aucun historique de conversation trouvé pour cet élève.",
      });
    }

    let conversationText = "";
    threads.forEach((t) => {
      conversationText += `\nSession: ${t.topic}\n`;
      t.messages.forEach((msg: any) => {
        if (msg.role === "system") return;
        const role = msg.role === "user" ? "Élève" : "Professeur IA";
        let text = msg.content;
        if (Array.isArray(msg.content)) {
          text = msg.content
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join("");
        }
        conversationText += `${role}: ${text}\n`;
      });
    });

    if (conversationText.trim().length === 0) {
      return res.json({
        evaluation: "Les conversations de cet élève sont vides.",
      });
    }

    if (OLLAMA_URL === "mock") {
      return res.json({
        evaluation:
          "Bilan (Mock) : L'élève participe activement mais rencontre quelques difficultés sur les concepts abordés. Des exercices de renforcement seraient utiles.",
      });
    }

    const systemPrompt = `Tu es un expert pédagogique. Voici l'historique complet des conversations entre un élève et son professeur IA.
    
CONSIGNES :
1. Rédige un bilan clair et très concis (environ 3 à 5 lignes maximum) évaluant les compétences de l'élève.
2. Identifie les points forts et les lacunes éventuelles (si visible).
3. Formule le texte directement pour qu'il soit lu par un professeur (ex: "L'élève démontre une bonne compréhension de...").
Ne dis pas "Voici le bilan", donne directement l'évaluation.`;

    const { text } = await generateText({
      model: ONLINE_MODE
        ? google("gemini-3.1-flash-lite")
        : ollama(OLLAMA_MODEL),
      messages: [
        { role: "user", content: `Historique :\n${conversationText}` },
      ],
      system: systemPrompt,
    });

    res.json({ evaluation: text });
  } catch (error: any) {
    console.error("Evaluate API error:", error);
    res.status(500).json({ error: "Failed to evaluate student skills" });
  }
});

// -----------------------------
// GLOSSARY API
// -----------------------------
app.post("/api/glossary", async (req, res) => {
  try {
    const {
      studentId,
      sessionId,
      aiDocuments = [],
      frenchLevel,
      nativeLanguage,
      topic,
    } = req.body;

    if (!nativeLanguage || nativeLanguage.trim() === "") {
      return res
        .status(400)
        .json({ error: "Langue maternelle de l'élève requise." });
    }

    // Read PDF files from RAG_src
    const ragSrcPath = path.join(
      __dirname,
      "../../../langchain_python/RAG_src",
    );
    let combinedText = "";

    for (const doc of aiDocuments) {
      const filePath = path.join(ragSrcPath, doc.name);
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        if (filePath.toLowerCase().endsWith(".pdf")) {
          const pdfText = await parsePdfText(fileBuffer);
          combinedText += `\n--- Document: ${doc.name} ---\n${pdfText}\n`;
        } else {
          combinedText += `\n--- Document: ${doc.name} ---\n${fileBuffer.toString("utf-8")}\n`;
        }
      }
    }

    const systemPrompt = `Tu es un professeur de langue expert. Ton rôle est de créer un glossaire bilingue très ciblé pour un élève.
Niveau de l'élève en français : ${frenchLevel || "Débutant (A1)"}
Langue maternelle de l'élève : ${nativeLanguage && nativeLanguage !== "Français" ? nativeLanguage : "Vietnamien"}

À partir des documents ou du sujet fourni, génère exactement 10 à 15 mots, concepts clés ou expressions qui sont essentiels pour comprendre la leçon ET qui pourraient être difficiles pour cet élève.
Pour chaque mot, donne :
1. Le mot en français.
2. Sa traduction la plus naturelle et précise dans la langue maternelle de l'élève (${nativeLanguage && nativeLanguage !== "Français" ? nativeLanguage : "Vietnamien"}).
3. Une explication très simple et courte en français, adaptée à son niveau (${frenchLevel || "A1"}).`;

    const promptText = combinedText
      ? `Voici les textes des documents:\n${combinedText}\n\nGénère le glossaire bilingue comme demandé.`
      : `Voici le sujet de la session d'étude:\n${topic || "ce cours"}\n\nGénère le glossaire bilingue pour ce sujet comme demandé.`;

    const { object } = await generateObject({
      model: ONLINE_MODE
        ? google("gemini-3.1-flash-lite")
        : ollama(OLLAMA_MODEL),
      system: systemPrompt,
      prompt: promptText,
      schema: z.object({
        glossary: z.array(
          z.object({
            motFr: z.string().describe("Le mot ou l'expression en français"),
            traduction: z
              .string()
              .describe(`La traduction en ${nativeLanguage || "Anglais"}`),
            explication: z
              .string()
              .describe("L'explication très simple en français"),
          }),
        ),
      }),
    });

    if (sessionId && object.glossary && object.glossary.length > 0) {
      const fileName = `Glossaire_${Date.now()}.txt`;
      let fileContent = `Vocabulaire Bilingue (${nativeLanguage})\n\n`;
      object.glossary.forEach((item: any) => {
        fileContent += `- ${item.motFr} (${item.traduction}) : ${item.explication}\n`;
      });
      fs.writeFileSync(path.join(ragSrcPath, fileName), fileContent);

      const fileUrl = `http://localhost:5000/uploads/${encodeURIComponent(fileName)}`;
      if (studentId) {
        await Student.findOneAndUpdate(
          { studentId },
          {
            $push: {
              personalDocuments: { name: "Glossaire Bilingue", url: fileUrl },
            },
          },
        );
      }
    }

    res.json(object);
  } catch (error: any) {
    console.error("Glossary API Error:", error);
    res.status(500).json({
      error: `Failed to generate glossary: ${error?.message || String(error)}`,
      details: error?.stack || String(error),
    });
  }
});

// -----------------------------
// SYNC API
// -----------------------------
app.post("/api/sync", async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      messages,
      languageLevel,
      mathLevel,
      subject,
      topic,
    } = req.body;
    if (!studentId)
      return res.status(400).json({ error: "ID de l'élève manquant" });

    await Student.findOneAndUpdate(
      { studentId },
      { lastActive: new Date() },
      {},
    );

    const thread = await Thread.findOneAndUpdate(
      { studentId, topic: topic || "Discussion libre" },
      {
        studentName,
        messages,
        updatedAt: new Date(),
        languageLevel: languageLevel || "A1",
        mathLevel: mathLevel || "CP",
        subject: subject || "Mathématiques",
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    res.json(thread);
  } catch (error) {
    console.error("Error syncing thread:", error);
    res.status(500).json({ error: "Failed to sync thread" });
  }
});

// -----------------------------
// UPLOAD API
// -----------------------------
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // In backend, we'll just parse the content and send it back immediately
    // Next.js frontend will use this returned content to store it in AI documents context
    const buffer = req.file.buffer;
    let content = "";

    // Sauvegarde physique dans le dossier source du RAG Python
    const ragSrcPath = path.join(
      __dirname,
      "../../../langchain_python/RAG_src",
    );
    if (!fs.existsSync(ragSrcPath)) {
      fs.mkdirSync(ragSrcPath, { recursive: true });
    }
    const filePath = path.join(ragSrcPath, req.file.originalname);
    fs.writeFileSync(filePath, buffer);

    // Déclencher la vectorisation sur le serveur Python
    try {
      await fetch("http://localhost:8000/vectorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePaths: [filePath] }),
      });
      console.log(
        `[RAG] Fichier ${req.file.originalname} vectorisé avec succès.`,
      );
    } catch (err) {
      console.error("[RAG] Erreur lors de la vectorisation:", err);
    }

    try {
      if (req.file.originalname.toLowerCase().endsWith(".pdf")) {
        content = await parsePdfText(buffer);
      } else if (req.file.originalname.toLowerCase().endsWith(".txt")) {
        content = buffer.toString("utf-8");
      }
    } catch (parseError) {
      console.error("Error parsing document text:", parseError);
    }

    res.json({
      success: true,
      url: `http://localhost:5000/uploads/${encodeURIComponent(req.file.originalname)}`,
      name: req.file.originalname,
      content,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// -----------------------------
// STUDENTS API
// -----------------------------
app.get("/api/students", async (req, res) => {
  try {
    const students = await Student.find({}).sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

app.post("/api/students", async (req, res) => {
  try {
    const body = req.body;
    if (!body.studentId) {
      body.studentId = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    const student = await Student.create(body);
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: "Failed to create student" });
  }
});

app.delete("/api/students/all", async (req, res) => {
  try {
    await Student.deleteMany({});
    res.json({ success: true, message: "Tous les élèves ont été supprimés." });
  } catch (error) {
    console.error("Error deleting all students:", error);
    res.status(500).json({ error: "Failed to delete all students" });
  }
});

app.get("/api/students/login", async (req, res) => {
  try {
    const studentId = req.query.studentId as string;
    if (!studentId) return res.status(400).json({ error: "ID manquant" });

    const student = await Student.findOne({ studentId }).populate("sessionIds");
    if (!student) return res.status(404).json({ error: "Élève non trouvé" });

    res.json(student);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.patch("/api/students/:id", async (req, res) => {
  try {
    const { action, sessionId, ...rest } = req.body;
    let update: any = {};
    if (Object.keys(rest).length > 0) {
      update.$set = rest;
    }

    if (action === "addSession" && sessionId) {
      update.$addToSet = { sessionIds: sessionId };
    } else if (action === "removeSession" && sessionId) {
      update.$pull = { sessionIds: sessionId };
    }

    const student = await Student.findByIdAndUpdate(req.params.id, update, {
      returnDocument: "after",
    });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: "Failed to update student" });
  }
});

app.put("/api/students/:id", async (req, res) => {
  try {
    const { action, sessionId, ...rest } = req.body;
    let update: any = {};
    if (Object.keys(rest).length > 0) {
      update.$set = rest;
    }

    if (action === "addSession" && sessionId) {
      update.$addToSet = { sessionIds: sessionId };
    } else if (action === "removeSession" && sessionId) {
      update.$pull = { sessionIds: sessionId };
    }

    const student = await Student.findByIdAndUpdate(req.params.id, update, {
      returnDocument: "after",
    });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: "Failed to update student" });
  }
});

app.delete("/api/students/:id", async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: "Élève supprimé" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete student" });
  }
});

// -----------------------------
// SESSIONS API
// -----------------------------
app.get("/api/sessions", async (req, res) => {
  try {
    const sessions = await Session.find({}).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

app.post("/api/sessions", async (req, res) => {
  try {
    const session = await Session.create(req.body);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: "Failed to create session" });
  }
});

app.patch("/api/sessions/:id", async (req, res) => {
  try {
    const session = await Session.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: "after",
    });
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: "Failed to update session" });
  }
});

app.delete("/api/sessions/:id", async (req, res) => {
  try {
    await Session.findByIdAndDelete(req.params.id);
    res.json({ message: "Session supprimée" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete session" });
  }
});

// -----------------------------
// THREADS API
// -----------------------------
app.get("/api/threads", async (req, res) => {
  try {
    const studentId = req.query.studentId as string;
    const studentName = req.query.studentName as string;
    let query = {};
    if (studentId) query = { studentId };
    else if (studentName) query = { studentName };

    const threads = await Thread.find(query).sort({ updatedAt: -1 });
    res.json(threads);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch threads" });
  }
});

app.post("/api/threads", async (req, res) => {
  try {
    const thread = await Thread.create(req.body);
    res.json(thread);
  } catch (error) {
    res.status(500).json({ error: "Failed to create thread" });
  }
});

app.delete("/api/threads/:id", async (req, res) => {
  try {
    await Thread.findByIdAndDelete(req.params.id);
    res.json({ message: "Discussion supprimée" });
  } catch (error) {
    res.status(500).json({ error: "Échec de la suppression" });
  }
});

// -----------------------------
// SEED API
// -----------------------------
app.get("/api/seed", async (req, res) => {
  try {
    // Basic seed mock data
    await Student.deleteMany({});
    await Thread.deleteMany({});
    await Session.deleteMany({});

    // Minimal seeded logic (to avoid huge script here)
    const sessionDoc = await Session.create({
      title: "Introduction à la Physique",
      objective: "Comprendre les lois de Newton.",
      subject: "Physique",
      mathLevel: "3ème",
    });

    await Student.create({
      studentId: "MARIE_CURIE",
      firstName: "Marie",
      lastName: "Curie",
      frenchLevel: "C1",
      mathLevel: "3ème",
      sessionIds: [sessionDoc._id],
    });

    res.json({ message: "Database seeded successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to seed DB" });
  }
});

// Server is started in dbConnect().then() at the top of the file
