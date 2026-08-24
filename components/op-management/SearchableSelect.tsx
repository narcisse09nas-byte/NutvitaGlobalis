"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronUpDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";

export type SearchableSelectOption = { value: string; label: string; hint?: string };

// Refinement program, Wave 1: any dropdown expected to exceed ~10 options gets a type-to-filter
// combobox instead of a bare <select> — Sites, Staff, Suppliers, Stakeholders, budget lines,
// deliverables, POs, etc. Emits a hidden <input> so it drops straight into existing
// FormData-based submit handlers exactly like a native <select name="...">.
export default function SearchableSelect({ name, options, defaultValue, placeholder, required, allowOther, otherLabel, onChange }: {
  name: string; options: SearchableSelectOption[]; defaultValue?: string; placeholder?: string;
  required?: boolean; allowOther?: boolean; otherLabel?: string; onChange?: (value: string) => void;
}) {
  const { en } = usePpmLocale();
  const [value, setValue] = useState(defaultValue || "");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isOther = value === "__other__";

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = options.find(option => option.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(option => option.label.toLowerCase().includes(q) || option.hint?.toLowerCase().includes(q));
  }, [options, query]);

  function pick(next: string) {
    setValue(next);
    setQuery("");
    setOpen(false);
    onChange?.(next);
  }

  return <div ref={containerRef} className="relative grid gap-2">
    <input type="hidden" name={isOther ? undefined : name} value={value} required={required && !isOther} />
    <button type="button" onClick={() => setOpen(current => !current)} className="admin-input flex items-center justify-between text-left">
      <span className={selected ? "" : "text-slate-400"}>{selected ? selected.label : placeholder || (en ? "Select..." : "Selectionner...")}</span>
      <ChevronUpDownIcon className="h-4 shrink-0 text-slate-400" />
    </button>
    {open && <div className="absolute z-30 mt-1 w-full rounded-xl border bg-white p-2 shadow-xl">
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
        <MagnifyingGlassIcon className="h-4 text-slate-400" />
        <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder={en ? "Search..." : "Rechercher..."} className="w-full bg-transparent text-sm outline-none" />
      </div>
      <div className="mt-2 max-h-56 overflow-y-auto">
        {filtered.map(option => <button key={option.value} type="button" onClick={() => pick(option.value)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-mint">
          {option.label}{option.hint && <span className="ml-2 text-xs text-slate-400">{option.hint}</span>}
        </button>)}
        {!filtered.length && <p className="px-3 py-2 text-sm text-slate-400">{en ? "No results." : "Aucun resultat."}</p>}
        {allowOther && <button type="button" onClick={() => pick("__other__")} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-leaf hover:bg-mint">{en ? "Other (specify)" : "Autre (preciser)"}</button>}
      </div>
    </div>}
    {isOther && <input name={name} placeholder={otherLabel || (en ? "Specify..." : "Preciser...")} required={required} className="admin-input" />}
  </div>;
}
