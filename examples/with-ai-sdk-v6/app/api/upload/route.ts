import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";
import dbConnect from "@/lib/db";
import { DocumentChunk } from "@/models/DocumentChunk";
import { chunkText, embedTexts } from "@/lib/rag";

async function indexPdf(buffer: Buffer, fileUrl: string, fileName: string) {
  // pdf-parse is CJS and ships a debug entrypoint at the package root that
  // tries to read a local test file when imported directly — import the
  // lib build to avoid that.
  // @ts-expect-error pdf-parse's lib entrypoint has no type declarations
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (
    buf: Buffer,
  ) => Promise<{ text: string }>;
  const { text } = await pdfParse(buffer);
  const chunks = chunkText(text);
  if (chunks.length === 0) return;

  const embeddings = await embedTexts(chunks);
  await dbConnect();
  await (DocumentChunk as any).insertMany(
    chunks.map((chunkContent, idx) => ({
      documentUrl: fileUrl,
      documentName: fileName,
      chunkIndex: idx,
      text: chunkContent,
      embedding: embeddings[idx],
    })),
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure the upload directory exists
    const uploadDir = join(process.cwd(), "public/uploads");
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // Ignore if directory exists
    }

    const filename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const path = join(uploadDir, filename);
    await writeFile(path, buffer);

    const fileUrl = `/uploads/${filename}`;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    let indexed = false;
    if (isPdf) {
      try {
        await indexPdf(buffer, fileUrl, file.name);
        indexed = true;
      } catch (err) {
        // The file is still uploaded/usable even if indexing fails (e.g.
        // Ollama or the embedding model is unavailable) — the AI just won't
        // be able to ground answers in this document's content.
        console.error("PDF indexing failed:", err);
      }
    }

    return NextResponse.json({
      success: true,
      url: fileUrl,
      name: file.name,
      indexed,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
