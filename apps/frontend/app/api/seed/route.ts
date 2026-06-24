import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Thread } from "@/models/Thread";
import { Student } from "@/models/Student";
import { Session } from "@/models/Session";

export async function GET() {
  try {
    await dbConnect();

    // Clear existing data
    await Thread.deleteMany({});
    await Student.deleteMany({});
    await Session.deleteMany({});

    // 1. Create Sample Sessions
    const sessions = await Session.insertMany([
      {
        title: "Calcul mental : Addition",
        objective:
          "Aider l'élève à maîtriser les additions simples sans retenue.",
        subject: "Mathématiques",
        mathLevel: "<6ème",
        createdBy: "TEACHER_ADMIN",
        documents: [],
      },
      {
        title: "Introduction à la Physique",
        objective: "Expliquer les concepts de base du mouvement.",
        subject: "Physique",
        mathLevel: "3ème",
        createdBy: "TEACHER_ADMIN",
        documents: [],
      },
    ]);

    // 2. Create Sample Students
    const studentData = [
      {
        studentId: "JEAN_DUPONT",
        firstName: "Jean",
        lastName: "Dupont",
        nativeLanguage: "Français",
        frenchLevel: "A1",
        mathLevel: "<6ème",
        sessionIds: [sessions[0]._id],
      },
      {
        studentId: "MARIE_CURIE",
        firstName: "Marie",
        lastName: "Curie",
        nativeLanguage: "Polonais",
        frenchLevel: "B1",
        mathLevel: "3ème",
        sessionIds: [sessions[1]._id],
      },
    ];

    const students = await Student.insertMany(studentData);

    // 3. Create Sample Threads (Chat Histories)
    const seedThreads = [
      {
        studentId: "JEAN_DUPONT",
        studentName: "Jean Dupont",
        languageLevel: "A1",
        subject: "Mathématiques",
        topic: "Addition et Soustraction",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Bonjour, je ne comprends pas comment faire 12 + 15.",
              },
            ],
          },
          {
            role: "assistant",
            content: [
              {
                type: "text",
                text: "Bonjour Jean ! C'est simple. Tu peux imaginer 10 + 10 = 20, puis 2 + 5 = 7. Donc 20 + 7 = 27.",
              },
            ],
          },
        ],
      },
      {
        studentId: "MARIE_CURIE",
        studentName: "Marie Curie",
        languageLevel: "B1",
        subject: "Physique",
        topic: "Vitesse et Accélération",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Quelle est la différence entre vitesse et accélération ?",
              },
            ],
          },
          {
            role: "assistant",
            content: [
              {
                type: "text",
                text: "La vitesse est la distance parcourue par unité de temps, alors que l'accélération est le changement de vitesse par unité de temps.",
              },
            ],
          },
        ],
      },
    ];

    await Thread.insertMany(seedThreads);

    return NextResponse.json({
      message:
        "Database seeded successfully with Student, Session, and Thread data!",
      seededStudents: students.map((s) => s.studentId),
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      {
        error: "Failed to seed database",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
