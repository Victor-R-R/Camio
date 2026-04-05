"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCompanySettingsForm } from "@/lib/actions/settings-forms";
import type { CompanySettingsModel } from "@/lib/generated/prisma/models/CompanySettings";

interface Props {
  company: CompanySettingsModel | null;
}

export function SettingsForm({ company }: Props) {
  const [logoUrl, setLogoUrl] = useState(company?.logoUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setUploadError("Échec de l'upload du logo");
      } else {
        setLogoUrl(data.url);
      }
    } catch {
      setUploadError("Erreur réseau lors de l'upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={updateCompanySettingsForm} className="space-y-4">
      <input type="hidden" name="logoUrl" value={logoUrl} />

      <div className="space-y-2">
        <Label>Nom de l&apos;entreprise</Label>
        <Input name="name" defaultValue={company?.name ?? ""} required />
      </div>
      <div className="space-y-2">
        <Label>Adresse</Label>
        <Input name="address" defaultValue={company?.address ?? ""} />
      </div>
      <div className="space-y-2">
        <Label>Téléphone</Label>
        <Input name="phone" defaultValue={company?.phone ?? ""} />
      </div>
      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex items-center gap-4">
          {logoUrl && (
            <Image src={logoUrl} alt="Logo" width={64} height={64} className="h-16 object-contain border rounded p-1" unoptimized />
          )}
          <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
        </div>
        {uploading && <p className="text-sm text-muted-foreground">Upload en cours…</p>}
        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
      </div>
      <Button type="submit" className="bg-[#E07B3A] hover:bg-[#c96a2a]">
        Enregistrer
      </Button>
    </form>
  );
}
