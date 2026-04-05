"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@/lib/generated/prisma/enums";

export async function updateCompanySettings(data: {
  name: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
}) {
  await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
  revalidatePath("/settings");
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: Role;
}) {
  const passwordHash = await bcrypt.hash(data.password, 12);
  await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash, role: data.role },
  });
  revalidatePath("/settings");
}

export async function updateUserRole(id: string, role: Role) {
  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/settings");
}
