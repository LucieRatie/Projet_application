import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Thread } from "@/models/Thread";
import { Student } from "@/models/Student";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const {
      studentId,
      studentName,
      messages,
      languageLevel,
      mathLevel,
      subject,
      topic,
      sessionId,
    } = body;

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

    // Update student's lastActive timestamp
    await (Student as any).findOneAndUpdate(
      { studentId },
      { lastActive: new Date() },
      {},
    );

    // Find or create the thread for this student's session (keyed by sessionId,
    // not topic title, so renaming/duplicate session titles can't collide threads
    // and switching sessions never overwrites another session's history).
    const thread = await (Thread as any).findOneAndUpdate(
      { studentId, sessionId: sessionId || "free-discussion" },
      {
        studentName,
        messages,
        updatedAt: new Date(),
        languageLevel: languageLevel || "A1",
        mathLevel: mathLevel || "CP",
        subject: subject || "Mathématiques",
        topic: topic || "Discussion libre",
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
