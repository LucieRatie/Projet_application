import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema(
  {
    studentId: { type: String, unique: true, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    description: { type: String, default: "" },
    nativeLanguage: { type: String, default: "Français" },
    frenchLevel: {
      type: String,
      enum: ["A1", "A2", "B1", "B2", "C1"],
      default: "A1",
    },
    mathLevel: {
      type: String,
      enum: ["<6ème", "6ème", "5ème", "4ème", "3ème", ">3ème"],
      default: "<6ème",
    },
    sessionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Session" }],
    personalDocuments: [
      {
        name: { type: String },
        url: { type: String },
      },
    ],
    lastActive: { type: Date, default: Date.now },
    skillsSummary: {
      vocabulary: { type: Number, default: 0 },
      grammar: { type: Number, default: 0 },
      comprehension: { type: Number, default: 0 },
      mathLogic: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

export const Student =
  mongoose.models.Student || mongoose.model("Student", StudentSchema);
