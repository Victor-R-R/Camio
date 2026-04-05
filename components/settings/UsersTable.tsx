import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createUserForm } from "@/lib/actions/settings-forms";
import { updateUserRole } from "@/lib/actions/settings";
import type { UserModel } from "@/lib/generated/prisma/models/User";

export function UsersTable({ users }: { users: UserModel[] }) {
  return (
    <div className="space-y-4">
      <form action={createUserForm} className="flex gap-2 flex-wrap">
        <Input name="name" placeholder="Nom" required className="max-w-36" />
        <Input name="email" type="email" placeholder="Email" required className="max-w-48" />
        <Input name="password" type="password" placeholder="Mot de passe" required className="max-w-36" />
        <select name="role" className="border rounded px-3 py-2 text-sm">
          <option value="BUREAU">Bureau</option>
          <option value="ADMIN">Admin</option>
        </select>
        <Button type="submit" variant="outline">Ajouter</Button>
      </form>

      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left">Nom</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Rôle</th>
              <th className="p-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3 text-muted-foreground">{u.email}</td>
                <td className="p-3">
                  <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                    {u.role === "ADMIN" ? "Admin" : "Bureau"}
                  </Badge>
                </td>
                <td className="p-3">
                  <form action={updateUserRole.bind(null, u.id, u.role === "ADMIN" ? "BUREAU" : "ADMIN")}>
                    <Button variant="ghost" size="sm" type="submit">
                      → {u.role === "ADMIN" ? "Bureau" : "Admin"}
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
