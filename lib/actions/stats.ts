"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Unit } from "@/lib/generated/prisma/enums";

export async function upsertAllocation({
  chantierId,
  materiauId,
  quantity,
  unit,
}: {
  chantierId: string;
  materiauId: string;
  quantity: number;
  unit: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  await prisma.allocation.upsert({
    where: { chantierId_materiauId: { chantierId, materiauId } },
    update: { quantity, unit: unit as Unit },
    create: { chantierId, materiauId, quantity, unit: unit as Unit },
  });

  revalidatePath("/stats");
}

export async function createConsommationEntry({
  chantierId,
  materiauId,
  quantity,
  unit,
  date,
  notes,
}: {
  chantierId: string;
  materiauId: string;
  quantity: number;
  unit: string;
  date: string;
  notes: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  await prisma.consommationEntry.create({
    data: {
      chantierId,
      materiauId,
      quantity,
      unit: unit as Unit,
      date: new Date(date),
      notes,
    },
  });

  revalidatePath("/stats");
}

export async function deleteConsommationEntry(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  await prisma.consommationEntry.delete({ where: { id } });
  revalidatePath("/stats");
}
