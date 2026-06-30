import { logoutAction } from "@/app/actions/auth";
import { initials } from "@/lib/utils";
import { LogOut } from "lucide-react";
import type { Role } from "@prisma/client";

export function Topbar({ name, role }: { name: string; role: Role }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="text-sm text-slate-500">
        Welcome back, <span className="font-medium text-slate-800">{name.split(" ")[0]}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {initials(name)}
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight text-slate-800">{name}</p>
            <p className="text-xs text-slate-400">{role}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn-ghost" title="Logout">
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </header>
  );
}
