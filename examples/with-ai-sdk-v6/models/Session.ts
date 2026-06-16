import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  objective: { type: String, required: true }, // The prompt/goal for the AI
  subject: { type: String, default: "Général" },
  documents: [{ name: String, url: String }],
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
});

export const Session =
  mongoose.models.Session || mongoose.model("Session", SessionSchema);
