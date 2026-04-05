"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListStatus } from "@/lib/generated/prisma/enums";
import type { ItemRow } from "@/lib/types";

export async function createList(formData: FormData, generate = false) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  const itemsJson = formData.get("itemsJson") as string;
  const items: ItemRow[] = itemsJson ? JSON.parse(itemsJson) : [];

  const list = await prisma.loadingList.create({
    data: {
      date: new Date(formData.get("date") as string),
      departureTime: formData.get("departureTime") as string,
      chantierId: formData.get("chantierId") as string,
      chauffeurId: formData.get("chauffeurId") as string,
      responsable: formData.get("responsable") as string,
      notes: (formData.get("notes") as string) || null,
      status: generate ? ListStatus.GENERATED : ListStatus.DRAFT,
      createdById: session.user.id,
      items: {
        create: items.map((item, index) => ({
          designation: item.designation,
          quantity: item.quantity,
          unit: item.unit as any,
          materiauId: item.materiauId || null,
          order: index,
        })),
      },
    },
  });

  revalidatePath("/history");

  if (generate) {
    redirect(`/lists/${list.id}/print`);
  } else {
    redirect(`/lists/${list.id}`);
  }
}

export async function updateList(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  const itemsJson = formData.get("itemsJson") as string;
  const items: ItemRow[] = itemsJson ? JSON.parse(itemsJson) : [];

  await prisma.$transaction(async (tx) => {
    await tx.loadingListItem.deleteMany({ where: { listId: id } });
    await tx.loadingList.update({
      where: { id },
      data: {
        date: new Date(formData.get("date") as string),
        departureTime: formData.get("departureTime") as string,
        chantierId: formData.get("chantierId") as string,
        chauffeurId: formData.get("chauffeurId") as string,
        responsable: formData.get("responsable") as string,
        notes: (formData.get("notes") as string) || null,
        items: {
          create: items.map((item, index) => ({
            designation: item.designation,
            quantity: item.quantity,
            unit: item.unit as any,
            materiauId: item.materiauId || null,
            order: index,
          })),
        },
      },
    });
  });

  revalidatePath(`/lists/${id}`);
  revalidatePath("/history");
}

export async function generateList(id: string) {
  await prisma.loadingList.update({
    where: { id },
    data: { status: ListStatus.GENERATED },
  });
  revalidatePath(`/lists/${id}`);
  redirect(`/lists/${id}/print`);
}

export async function duplicateList(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  const original = await prisma.loadingList.findUniqueOrThrow({
    where: { id },
    include: { items: true },
  });

  const copy = await prisma.loadingList.create({
    data: {
      date: new Date(),
      departureTime: original.departureTime,
      chantierId: original.chantierId,
      chauffeurId: original.chauffeurId,
      responsable: original.responsable,
      notes: original.notes,
      status: ListStatus.DRAFT,
      createdById: session.user.id,
      items: {
        create: original.items.map((item) => ({
          materiauId: item.materiauId,
          designation: item.designation,
          quantity: item.quantity,
          unit: item.unit,
          order: item.order,
          checked: false,
        })),
      },
    },
  });

  revalidatePath("/history");
  redirect(`/lists/${copy.id}`);
}

export async function deleteList(id: string) {
  await prisma.loadingList.delete({ where: { id } });
  revalidatePath("/history");
  redirect("/history");
}

export async function updateListStatus(id: string, status: ListStatus) {
  await prisma.loadingList.update({ where: { id }, data: { status } });
  revalidatePath("/history");
  revalidatePath(`/lists/${id}`);
}
