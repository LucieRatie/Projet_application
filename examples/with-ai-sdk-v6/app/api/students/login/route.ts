import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Student } from "@/models/Student";
import { Session } from "@/models/Session";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    const student = await Student.findOne({ studentId }).populate("sessionIds");

    if (!student) {
      return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
