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
  messages: [MessageSchema],
  updatedAt: { type: Date, default: Date.now },
});

export const Thread =
  mongoose.models.Thread || mongoose.model("Thread", ThreadSchema);
