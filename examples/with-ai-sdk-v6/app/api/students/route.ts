import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Student } from "@/models/Student";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const students = await Student.find({}).sort({ createdAt: -1 });
    return NextResponse.json(students);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    // Generate a unique 6-character student ID if not provided
    if (!body.studentId) {
      body.studentId = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    const student = await Student.create(body);
    return NextResponse.json(student);
  } catch (error) {
    console.error("Error creating student:", error);
    return NextResponse.json(
      { error: "Failed to create student" },
      { status: 500 },
    );
  }
}
