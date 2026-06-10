import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** Laddar ner en dokumentversion (filinnehållet ligger i databasen). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const { versionId } = await params;
  const version = await prisma.documentVersion.findUnique({ where: { id: versionId } });
  if (!version) {
    return NextResponse.json({ error: "Filen hittades inte." }, { status: 404 });
  }

  return new Response(new Uint8Array(version.data), {
    headers: {
      "Content-Type": version.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(version.fileName)}`,
      "Cache-Control": "private, max-age=0",
    },
  });
}
