import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Thread } from "@/models/Thread";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const studentName = searchParams.get("studentName");
    const sessionId = searchParams.get("sessionId");

    const query: Record<string, string> = {};
    if (studentId) {
      query.studentId = studentId;
    } else if (studentName) {
      query.studentName = studentName;
    }
    if (sessionId) {
      query.sessionId = sessionId;
    }

    const threads = await Thread.find(query).sort({ updatedAt: -1 });
    return NextResponse.json(threads);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const thread = await Thread.create(body);
    return NextResponse.json(thread);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 },
    );
  }
}
