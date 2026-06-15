import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Thread } from "@/models/Thread";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { studentId, studentName, messages, languageLevel, subject, topic } =
      body;

    if (!studentId) {
      return NextResponse.json(
        { error: "ID de l'élève manquant" },
        { status: 400 },
      );
    }

    console.log(
      `Sync request for student ${studentId}:`,
      JSON.stringify(messages),
    );

    // Find or create a thread for this student ID
    const thread = await Thread.findOneAndUpdate(
      { studentId },
      {
        studentName,
        messages,
        updatedAt: new Date(),
        languageLevel: languageLevel || "A1",
        subject: subject || "Mathématiques",
        topic: topic || "Discussion en cours",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json(thread);
  } catch (error) {
    console.error("Error syncing thread:", error);
    return NextResponse.json(
      { error: "Failed to sync thread" },
      { status: 500 },
    );
  }
}
