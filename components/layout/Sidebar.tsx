"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, Clock, BookOpen, Settings, LogOut, Truck, BarChart2 } from "lucide-react";

const navItems = [
  { href: "/lists/new", label: "Nouvelle liste", icon: Plus },
  { href: "/history", label: "Historique", icon: Clock },
  { href: "/catalogue", label: "Catalogue", icon: BookOpen },
  { href: "/stats", label: "Statistiques", icon: BarChart2 },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-[#3D4A5C] text-white flex flex-col">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-[#E07B3A]" />
          <span className="font-bold text-lg">Camio</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              pathname === href || (href !== "/lists/new" && pathname.startsWith(href))
                ? "bg-[#E07B3A] text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <Button
          variant="ghost"
          className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </div>
    </aside>
  );
}
