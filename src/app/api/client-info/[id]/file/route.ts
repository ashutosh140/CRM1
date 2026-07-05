import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const item = await prisma.clientInfo.findUnique({
    where: { id },
    select: { fileData: true, fileName: true, fileType: true },
  });
  if (!item || !item.fileData) return new NextResponse("Not found", { status: 404 });

  const base64 = item.fileData.split(",")[1] ?? "";
  const buffer = Buffer.from(base64, "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": item.fileType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${(item.fileName || "file").replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
