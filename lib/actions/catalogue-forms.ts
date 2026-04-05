"use server";

import { Unit } from "@/lib/generated/prisma/enums";
import {
  createChantier,
  createChauffeur,
  createMateriau,
} from "@/lib/actions/catalogue";

export async function createChantierForm(formData: FormData) {
  const name = formData.get("name") as string;
  const address = (formData.get("address") as string) || undefined;
  if (!name?.trim()) throw new Error("Nom requis");
  await createChantier({ name: name.trim(), address });
}

export async function createChauffeurForm(formData: FormData) {
  const name = formData.get("name") as string;
  const phone = (formData.get("phone") as string) || undefined;
  if (!name?.trim()) throw new Error("Nom requis");
  await createChauffeur({ name: name.trim(), phone });
}

export async function createMateriauForm(formData: FormData) {
  const designation = formData.get("designation") as string;
  const defaultUnit = formData.get("defaultUnit") as Unit;
  if (!designation?.trim()) throw new Error("Désignation requise");
  if (!Object.values(Unit).includes(defaultUnit)) throw new Error("Unité invalide");
  await createMateriau({ designation: designation.trim(), defaultUnit });
}
