import mongoose from "mongoose";

const DocumentChunkSchema = new mongoose.Schema({
  documentUrl: { type: String, required: true, index: true },
  documentName: String,
  chunkIndex: Number,
  text: String,
  embedding: [Number],
  createdAt: { type: Date, default: Date.now },
});

export const DocumentChunk =
  mongoose.models.DocumentChunk ||
  mongoose.model("DocumentChunk", DocumentChunkSchema);
