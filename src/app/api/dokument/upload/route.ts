import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import type { DocumentCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { documentCategoryLabels } from "@/lib/labels";

// Serverless-plattformarnas gräns för request-storlek ligger kring 4,5 MB.
const MAX_FILE_BYTES = 4 * 1024 * 1024;

const CATEGORIES = Object.keys(documentCategoryLabels) as DocumentCategory[];

/**
 * Tar emot en fil (multipart) och sparar den som dokumentversion.
 * Samma logiska dokumentnamn (originalfilnamnet) ger version 2, 3 osv.
 * Filnamnet per version följer namnstandarden
 * [Projektnummer]_[Kategori]_[Datum]_[Originalnamn].
 */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Ogiltig uppladdning." }, { status: 400 });

  const projectId = form.get("projectId");
  const category = form.get("category");
  const file = form.get("file");

  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId saknas." }, { status: 400 });
  }
  if (typeof category !== "string" || !CATEGORIES.includes(category as DocumentCategory)) {
    return NextResponse.json({ error: "Ogiltig kategori." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Ingen fil bifogad." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `”${file.name}” är större än 4 MB. Dela upp eller komprimera filen.` },
      { status: 413 }
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, projectNumber: true },
  });
  if (!project) return NextResponse.json({ error: "Projektet hittades inte." }, { status: 404 });

  const data = Buffer.from(await file.arrayBuffer());
  const today = new Date().toLocaleDateString("sv-SE");
  const categoryLabel = documentCategoryLabels[category as DocumentCategory];
  const standardName = `${project.projectNumber}_${categoryLabel}_${today}_${file.name}`;

  // Samma dokumentnamn => ny version med historik
  const existing = await prisma.document.findUnique({
    where: { projectId_name: { projectId, name: file.name } },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });

  let version: number;
  if (existing) {
    version = (existing.versions[0]?.version ?? 0) + 1;
    await prisma.documentVersion.create({
      data: {
        documentId: existing.id,
        version,
        fileName: standardName,
        data,
        mimeType: file.type || null,
        size: file.size,
      },
    });
    await prisma.document.update({
      where: { id: existing.id },
      data: { category: category as DocumentCategory },
    });
  } else {
    version = 1;
    await prisma.document.create({
      data: {
        projectId,
        name: file.name,
        category: category as DocumentCategory,
        versions: {
          create: {
            version,
            fileName: standardName,
            data,
            mimeType: file.type || null,
            size: file.size,
          },
        },
      },
    });
  }

  await prisma.activityLog.create({
    data: {
      projectId,
      message:
        version === 1
          ? `Dokumentet ”${file.name}” laddades upp (${categoryLabel})`
          : `Dokumentet ”${file.name}” fick version ${version}`,
    },
  });

  revalidatePath(`/projekt/${projectId}`);
  revalidatePath("/dokument");
  return NextResponse.json({ ok: true, version });
}
