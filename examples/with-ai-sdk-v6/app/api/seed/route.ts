import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Thread } from "@/models/Thread";

export async function GET() {
  try {
    await dbConnect();

    // Clear existing data (optional)
    await Thread.deleteMany({});

    // Seed French Student Data
    const seedData = [
      {
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
      {
        studentName: "Ahmed Al-Farsi",
        languageLevel: "A2",
        subject: "Mathématiques",
        topic: "Théorème de Pythagore",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "C'est quoi un triangle rectangle ?" },
            ],
          },
          {
            role: "assistant",
            content: [
              {
                type: "text",
                text: "Un triangle rectangle est un triangle qui possède un angle droit (90 degrés).",
              },
            ],
          },
        ],
      },
    ];

    await Thread.insertMany(seedData);

    return NextResponse.json({
      message: "Database seeded successfully with French student data!",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to seed database" },
      { status: 500 },
    );
  }
}
