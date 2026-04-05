"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

interface Materiau {
  id: string;
  designation: string;
  defaultUnit: string;
}

interface Props {
  onSelect: (m: Materiau) => void;
}

export function CatalogSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Materiau[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/catalogue/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data) => {
          setResults(data);
          setOpen(data.length > 0);
        });
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Input
        placeholder="Rechercher dans le catalogue…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <ul className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
          {results.map((m) => (
            <li
              key={m.id}
              className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
              onMouseDown={() => {
                onSelect(m);
                setQuery("");
                setOpen(false);
              }}
            >
              {m.designation}
              <span className="text-muted-foreground ml-2 text-xs">{m.defaultUnit}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
