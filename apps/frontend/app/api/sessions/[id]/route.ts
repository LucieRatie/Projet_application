import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Session } from "@/models/Session";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const session = await Session.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const { id } = await params;
    await Session.findByIdAndDelete(id);
    return NextResponse.json({ message: "Session deleted" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 },
    );
  }
}
