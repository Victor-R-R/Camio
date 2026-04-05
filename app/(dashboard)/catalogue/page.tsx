import { prisma } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  createChantier, toggleChantierActive,
  createChauffeur, toggleChauffeurActive,
  createMateriau, toggleMateriauActive,
} from "@/lib/actions/catalogue";
import { Unit } from "@/lib/generated/prisma/enums";

const UNITS = Object.values(Unit) as Unit[];

export default async function CataloguePage() {
  const [chantiers, chauffeurs, materiaux] = await Promise.all([
    prisma.chantier.findMany({ orderBy: { name: "asc" } }),
    prisma.chauffeur.findMany({ orderBy: { name: "asc" } }),
    prisma.materiau.findMany({ orderBy: { designation: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#3D4A5C] mb-6">Catalogue</h1>

      <Tabs defaultValue="materiaux">
        <TabsList>
          <TabsTrigger value="materiaux">Matériaux ({materiaux.length})</TabsTrigger>
          <TabsTrigger value="chantiers">Chantiers ({chantiers.length})</TabsTrigger>
          <TabsTrigger value="chauffeurs">Chauffeurs ({chauffeurs.length})</TabsTrigger>
        </TabsList>

        {/* Matériaux */}
        <TabsContent value="materiaux" className="space-y-4 mt-4">
          <form
            action={async (fd: FormData) => {
              "use server";
              await createMateriau({
                designation: fd.get("designation") as string,
                defaultUnit: fd.get("defaultUnit") as Unit,
              });
            }}
            className="flex gap-2"
          >
            <Input name="designation" placeholder="Désignation" required className="max-w-xs" />
            <select name="defaultUnit" className="border rounded px-3 py-2 text-sm" required>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <Button type="submit" className="bg-[#E07B3A] hover:bg-[#c96a2a]">Ajouter</Button>
          </form>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left">Désignation</th>
                  <th className="p-3 text-left w-28">Unité défaut</th>
                  <th className="p-3 text-center w-20">Statut</th>
                  <th className="p-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {materiaux.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-3">{m.designation}</td>
                    <td className="p-3">{m.defaultUnit}</td>
                    <td className="p-3 text-center">
                      <Badge variant={m.active ? "default" : "secondary"}>{m.active ? "Actif" : "Inactif"}</Badge>
                    </td>
                    <td className="p-3">
                      <form action={toggleMateriauActive.bind(null, m.id, !m.active)}>
                        <Button variant="ghost" size="sm" type="submit">
                          {m.active ? "Désactiver" : "Activer"}
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Chantiers */}
        <TabsContent value="chantiers" className="space-y-4 mt-4">
          <form
            action={async (fd: FormData) => {
              "use server";
              await createChantier({
                name: fd.get("name") as string,
                address: (fd.get("address") as string) || undefined,
              });
            }}
            className="flex gap-2"
          >
            <Input name="name" placeholder="Nom du chantier" required className="max-w-xs" />
            <Input name="address" placeholder="Adresse (optionnel)" className="max-w-xs" />
            <Button type="submit" className="bg-[#E07B3A] hover:bg-[#c96a2a]">Ajouter</Button>
          </form>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left">Nom</th>
                  <th className="p-3 text-left">Adresse</th>
                  <th className="p-3 text-center w-20">Statut</th>
                  <th className="p-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {chantiers.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-muted-foreground">{c.address ?? "—"}</td>
                    <td className="p-3 text-center">
                      <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Actif" : "Inactif"}</Badge>
                    </td>
                    <td className="p-3">
                      <form action={toggleChantierActive.bind(null, c.id, !c.active)}>
                        <Button variant="ghost" size="sm" type="submit">
                          {c.active ? "Désactiver" : "Activer"}
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Chauffeurs */}
        <TabsContent value="chauffeurs" className="space-y-4 mt-4">
          <form
            action={async (fd: FormData) => {
              "use server";
              await createChauffeur({
                name: fd.get("name") as string,
                phone: (fd.get("phone") as string) || undefined,
              });
            }}
            className="flex gap-2"
          >
            <Input name="name" placeholder="Nom du chauffeur" required className="max-w-xs" />
            <Input name="phone" placeholder="Téléphone (optionnel)" className="max-w-xs" />
            <Button type="submit" className="bg-[#E07B3A] hover:bg-[#c96a2a]">Ajouter</Button>
          </form>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left">Nom</th>
                  <th className="p-3 text-left">Téléphone</th>
                  <th className="p-3 text-center w-20">Statut</th>
                  <th className="p-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {chauffeurs.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-muted-foreground">{c.phone ?? "—"}</td>
                    <td className="p-3 text-center">
                      <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Actif" : "Inactif"}</Badge>
                    </td>
                    <td className="p-3">
                      <form action={toggleChauffeurActive.bind(null, c.id, !c.active)}>
                        <Button variant="ghost" size="sm" type="submit">
                          {c.active ? "Désactiver" : "Activer"}
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
