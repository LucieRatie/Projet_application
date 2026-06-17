import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import pdfParse from "pdf-parse";
import { streamText, generateText, convertToModelMessages } from "ai";
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

const upload = multer({ storage: multer.memoryStorage() });

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:1b";

const ollama = createOllama({
  baseURL: OLLAMA_URL,
});

// Connect to MongoDB
dbConnect().then(() => console.log("Connected to MongoDB")).catch(console.error);

// -----------------------------
// CHAT API
// -----------------------------
app.post("/api/chat", async (req, res) => {
  try {
    const rawMessages = req.body.messages ?? [];
    const coreMessages = await convertToModelMessages(rawMessages);

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
              const responseText = "Bonjour ! Je suis l'assistant pédagogique DRAM. Comment puis-je vous aider aujourd'hui ?";
              controller.enqueue({ type: "text-delta", textDelta: responseText });
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

    const aiDocuments = req.body.aiDocuments || [];
    let docContext = "";
    if (aiDocuments.length > 0) {
      docContext = "DOCUMENTS DE COURS FOURNIS :\n";
      aiDocuments.forEach((doc: any) => {
        if (doc.content) {
          docContext += `\n--- Document: ${doc.name} ---\n${doc.content}\n--------------------\n`;
        }
      });
    }

    const systemPrompt = `Tu es un professeur chargé de répondre à la question d'un élève.
    
CONSIGNES STRICTES :
1. Tu DOIS IMPÉRATIVEMENT refuser de répondre si la question n'est pas liée au contexte des documents ou au sujet de la session d'étude. Dis simplement que tu ne peux répondre qu'aux questions liées au cours.
2. Sois très concis et direct. Ne t'éparpille pas dans des explications inutiles ou du bavardage.
3. Utilise uniquement les informations présentes dans le contexte fourni. Si tu n'as pas la réponse, dis-le clairement (ne devine pas, n'invente rien).
4. Rappelle-toi de l'historique de la conversation pour comprendre le contexte des questions.
5. Utilise les documents de cours fournis pour créer des exercices pour l'élève ou lui poser des questions supplémentaires s'il te le demande pour mieux comprendre. Base tes exercices UNIQUEMENT sur ces documents.

${docContext}`;

    const result = streamText({
      model: ollama(OLLAMA_MODEL),
      messages: coreMessages,
      system: systemPrompt,
    });

    result.pipeDataStreamToResponse(res);
  } catch (error: any) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: "Internal Error", details: error?.message || String(error) });
  }
});

// -----------------------------
// EVALUATE API
// -----------------------------
app.post("/api/evaluate", async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ error: "ID de l'élève manquant" });

    const threads = await Thread.find({ studentId }).sort({ updatedAt: -1 });
    if (!threads || threads.length === 0) {
      return res.json({ evaluation: "Aucun historique de conversation trouvé pour cet élève." });
    }

    let conversationText = "";
    threads.forEach((t) => {
      conversationText += `\nSession: ${t.topic}\n`;
      t.messages.forEach((msg: any) => {
        if (msg.role === "system") return;
        const role = msg.role === "user" ? "Élève" : "Professeur IA";
        let text = msg.content;
        if (Array.isArray(msg.content)) {
          text = msg.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
        }
        conversationText += `${role}: ${text}\n`;
      });
    });

    if (conversationText.trim().length === 0) {
      return res.json({ evaluation: "Les conversations de cet élève sont vides." });
    }

    if (OLLAMA_URL === "mock") {
      return res.json({ evaluation: "Bilan (Mock) : L'élève participe activement mais rencontre quelques difficultés sur les concepts abordés. Des exercices de renforcement seraient utiles." });
    }

    const systemPrompt = `Tu es un expert pédagogique. Voici l'historique complet des conversations entre un élève et son professeur IA.
    
CONSIGNES :
1. Rédige un bilan clair et très concis (environ 3 à 5 lignes maximum) évaluant les compétences de l'élève.
2. Identifie les points forts et les lacunes éventuelles (si visible).
3. Formule le texte directement pour qu'il soit lu par un professeur (ex: "L'élève démontre une bonne compréhension de...").
Ne dis pas "Voici le bilan", donne directement l'évaluation.`;

    const { text } = await generateText({
      model: ollama(OLLAMA_MODEL),
      messages: [{ role: "user", content: `Historique :\n${conversationText}` }],
      system: systemPrompt,
    });
    
    res.json({ evaluation: text });
  } catch (error: any) {
    console.error("Evaluate API error:", error);
    res.status(500).json({ error: "Failed to evaluate student skills" });
  }
});

// -----------------------------
// SYNC API
// -----------------------------
app.post("/api/sync", async (req, res) => {
  try {
    const { studentId, studentName, messages, languageLevel, mathLevel, subject, topic } = req.body;
    if (!studentId) return res.status(400).json({ error: "ID de l'élève manquant" });

    await Student.findOneAndUpdate({ studentId }, { lastActive: new Date() }, {});

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
      { upsert: true, new: true, setDefaultsOnInsert: true }
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

    try {
      if (req.file.originalname.toLowerCase().endsWith(".pdf")) {
        const pdfData = await pdfParse(buffer);
        content = pdfData.text;
      } else if (req.file.originalname.toLowerCase().endsWith(".txt")) {
        content = buffer.toString("utf-8");
      }
    } catch (parseError) {
      console.error("Error parsing document text:", parseError);
    }

    res.json({
      success: true,
      url: `/uploads/${req.file.originalname}`, // Mock URL for UI
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

app.put("/api/students/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
      mathLevel: "3ème"
    });

    await Student.create({
      studentId: "MARIE_CURIE",
      firstName: "Marie",
      lastName: "Curie",
      frenchLevel: "C1",
      mathLevel: "3ème",
      sessionIds: [sessionDoc._id]
    });

    res.json({ message: "Database seeded successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to seed DB" });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
