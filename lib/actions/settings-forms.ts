"use server";

import { Role } from "@/lib/generated/prisma/enums";
import { updateCompanySettings, createUser } from "@/lib/actions/settings";
import { auth } from "@/lib/auth";

export async function updateCompanySettingsForm(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Le nom est requis");
  await updateCompanySettings({
    name,
    address: (formData.get("address") as string)?.trim() || undefined,
    phone: (formData.get("phone") as string)?.trim() || undefined,
    logoUrl: (formData.get("logoUrl") as string)?.trim() || undefined,
  });
}

export async function createUserForm(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  const role = formData.get("role") as Role;
  if (!Object.values(Role).includes(role)) throw new Error("Rôle invalide");
  await createUser({
    name: (formData.get("name") as string)?.trim() || "",
    email: (formData.get("email") as string)?.trim() || "",
    password: formData.get("password") as string,
    role,
  });
}
