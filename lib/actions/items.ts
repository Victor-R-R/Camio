"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Unit } from "@/lib/generated/prisma/enums";

export async function addItem(
  listId: string,
  data: { designation: string; quantity: number; unit: Unit; materiauId?: string }
) {
  const maxOrder = await prisma.loadingListItem.aggregate({
    where: { listId },
    _max: { order: true },
  });

  await prisma.loadingListItem.create({
    data: {
      listId,
      designation: data.designation,
      quantity: data.quantity,
      unit: data.unit,
      materiauId: data.materiauId || null,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath(`/lists/${listId}`);
}

export async function removeItem(itemId: string, listId: string) {
  await prisma.loadingListItem.delete({ where: { id: itemId } });
  revalidatePath(`/lists/${listId}`);
}

export async function reorderItems(listId: string, orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.loadingListItem.update({ where: { id }, data: { order: index } })
    )
  );
  revalidatePath(`/lists/${listId}`);
}

export async function toggleItem(itemId: string, listId: string, checked: boolean) {
  await prisma.loadingListItem.update({
    where: { id: itemId },
    data: { checked },
  });

  // If all items checked → set list status to LOADED
  const items = await prisma.loadingListItem.findMany({ where: { listId } });
  if (items.length > 0 && items.every((i) => i.checked)) {
    await prisma.loadingList.update({
      where: { id: listId },
      data: { status: "LOADED" },
    });
  }

  // Revalidate the public checklist page
  const list = await prisma.loadingList.findUnique({
    where: { id: listId },
    select: { shareToken: true },
  });
  if (list) {
    revalidatePath(`/check/${list.shareToken}`);
  }
}
