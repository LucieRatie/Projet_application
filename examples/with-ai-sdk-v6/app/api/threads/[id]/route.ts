import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Thread } from "@/models/Thread";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    const thread = await Thread.findByIdAndUpdate(
      id,
      { status: body.status, updatedAt: new Date() },
      { new: true },
    );

    return NextResponse.json(thread);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du thread:", error);
    return NextResponse.json(
      { error: "Échec de la mise à jour" },
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

    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    await Thread.findByIdAndDelete(id);

    return NextResponse.json({ message: "Élève supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    return NextResponse.json(
      { error: "Échec de la suppression" },
      { status: 500 },
    );
  }
}
