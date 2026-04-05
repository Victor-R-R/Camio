import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { UsersTable } from "@/components/settings/UsersTable";

export default async function SettingsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const [company, users] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: "singleton" } }),
    isAdmin ? prisma.user.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#3D4A5C] mb-6">Paramètres</h1>
        <SettingsForm company={company} />
      </div>
      {isAdmin && (
        <div>
          <h2 className="text-xl font-semibold text-[#3D4A5C] mb-4">Utilisateurs</h2>
          <UsersTable users={users} />
        </div>
      )}
    </div>
  );
}
