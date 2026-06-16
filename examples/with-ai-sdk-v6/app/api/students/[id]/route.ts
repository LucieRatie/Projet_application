import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Student } from "@/models/Student";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    let update = body;
    if (body.action === "addSession") {
      update = { $addToSet: { sessionIds: body.sessionId } };
    } else if (body.action === "removeSession") {
      update = { $pull: { sessionIds: body.sessionId } };
    }

    const student = await (Student as any).findByIdAndUpdate(id, update, {
      new: true,
    });
    return NextResponse.json(student);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update student" },
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
    await Student.findByIdAndDelete(id);
    return NextResponse.json({ message: "Student deleted" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete student" },
      { status: 500 },
    );
  }
}
