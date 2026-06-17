import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  objective: { type: String, required: true }, // The prompt/goal for the AI
  subject: { type: String, default: "Général" },
  mathLevel: {
    type: String,
    enum: [
      "<6ème",
      "CP",
      "CE1",
      "CE2",
      "CM1",
      "CM2",
      "6ème",
      "5ème",
      "4ème",
      "3ème",
      ">3ème",
      "2nde",
      "1ère",
      "Terminale",
    ],
  },
  aiDocuments: [{ name: String, url: String, content: String }],
  exerciseDocuments: [{ name: String, url: String }],
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
});

export const Session =
  mongoose.models.Session || mongoose.model("Session", SessionSchema);
