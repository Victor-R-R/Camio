import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await prisma.materiau.findMany({
    where: {
      active: true,
      designation: { contains: q, mode: "insensitive" },
    },
    take: 10,
    select: { id: true, designation: true, defaultUnit: true },
  });
  return NextResponse.json(results);
}
