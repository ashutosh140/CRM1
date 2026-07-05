"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export function LeadSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [, start] = useTransition();

  // debounce → update the URL ?q=
  useEffect(() => {
    const t = setTimeout(() => {
      const sp = new URLSearchParams(Array.from(params.entries()));
      if (value.trim()) sp.set("q", value.trim());
      else sp.delete("q");
      start(() => router.replace(`/leads?${sp.toString()}`));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative max-w-sm flex-1">
      <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="input pl-9 pr-9"
        placeholder="Search by name, company, email, phone or ID (LD-…)"
      />
      {value && (
        <button onClick={() => setValue("")} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
