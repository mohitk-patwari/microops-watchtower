// src/app/api/incidents/[id]/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongo";
import { ObjectId } from "mongodb";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const status = body.status ?? "resolved"; // default action

    const db = await connectToDatabase();
    const incidentsCol = db.collection("incidents");

    // Use updateOne + findOne instead of findOneAndUpdate for consistent driver behavior
    const oid = new ObjectId(id);
    const updateRes = await incidentsCol.updateOne(
      { _id: oid },
      { $set: { status, lastSeen: new Date() } }
    );

    // If no document was matched, return 404
    if (updateRes.matchedCount === 0) {
      return NextResponse.json({ ok: false, error: "incident not found" }, { status: 404 });
    }

    // Read back the updated document
    const incidentDoc = await incidentsCol.findOne({ _id: oid });

    if (!incidentDoc) {
      return NextResponse.json({ ok: false, error: "could not retrieve updated incident" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      incident: {
        _id: String(incidentDoc._id),
        status: incidentDoc.status,
        lastSeen: incidentDoc.lastSeen ? incidentDoc.lastSeen.toISOString() : null,
      },
    });
  } catch (err: any) {
    console.error("PATCH /api/incidents/:id error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
