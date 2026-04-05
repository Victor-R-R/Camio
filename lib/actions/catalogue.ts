"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Unit } from "@/lib/generated/prisma/enums";

// Chantiers
export async function createChantier(data: { name: string; address?: string }) {
  await prisma.chantier.create({ data });
  revalidatePath("/catalogue");
}

export async function updateChantier(id: string, data: { name: string; address?: string }) {
  await prisma.chantier.update({ where: { id }, data });
  revalidatePath("/catalogue");
}

export async function toggleChantierActive(id: string, active: boolean) {
  await prisma.chantier.update({ where: { id }, data: { active } });
  revalidatePath("/catalogue");
}

// Chauffeurs
export async function createChauffeur(data: { name: string; phone?: string }) {
  await prisma.chauffeur.create({ data });
  revalidatePath("/catalogue");
}

export async function createChauffeurInline(data: { name: string; phone?: string }) {
  const chauffeur = await prisma.chauffeur.create({ data });
  revalidatePath("/catalogue");
  revalidatePath("/lists/new");
  return chauffeur;
}

export async function updateChauffeur(id: string, data: { name: string; phone?: string }) {
  await prisma.chauffeur.update({ where: { id }, data });
  revalidatePath("/catalogue");
}

export async function toggleChauffeurActive(id: string, active: boolean) {
  await prisma.chauffeur.update({ where: { id }, data: { active } });
  revalidatePath("/catalogue");
}

// Matériaux
export async function createMateriau(data: { designation: string; defaultUnit: Unit }) {
  await prisma.materiau.create({ data });
  revalidatePath("/catalogue");
}

export async function updateMateriau(
  id: string,
  data: { designation: string; defaultUnit: Unit }
) {
  await prisma.materiau.update({ where: { id }, data });
  revalidatePath("/catalogue");
}

export async function toggleMateriauActive(id: string, active: boolean) {
  await prisma.materiau.update({ where: { id }, data: { active } });
  revalidatePath("/catalogue");
}
