import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: [{ type: { type: String }, text: String }],
  createdAt: { type: Date, default: Date.now },
});

const ThreadSchema = new mongoose.Schema({
  studentId: String,
  studentName: String,
  languageLevel: {
    type: String,
    enum: ["A1", "A2", "B1", "B2"],
    default: "A1",
  },
  subject: { type: String, default: "Mathématiques" },
  mathLevel: String,
  topic: String,
  // Unique key for a student's session thread. Either a Session ObjectId string
  // or the sentinel "free-discussion". Threads must be looked up by this field,
  // not by `topic` (titles can be duplicated/renamed and would collide).
  sessionId: { type: String, default: "free-discussion" },
  status: { type: String, enum: ["active", "completed"], default: "active" },
  messages: [MessageSchema],
  summary: { type: String, default: null },
  summaryGeneratedAt: { type: Date, default: null },
  updatedAt: { type: Date, default: Date.now },
});

export const Thread =
  mongoose.models.Thread || mongoose.model("Thread", ThreadSchema);
