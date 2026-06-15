import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Session } from "@/models/Session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const sessions = await Session.find({}).sort({ createdAt: -1 });
    return NextResponse.json(sessions);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const session = await Session.create(body);
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}
