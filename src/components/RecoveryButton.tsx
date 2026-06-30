"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { recoverCustomerAction } from "@/app/actions/customers";

export function RecoveryButton({ customerId }: { customerId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="mt-2">
      <button
        className="btn-ghost w-full text-xs"
        disabled={pending}
        onClick={() => start(async () => {
          const r = await recoverCustomerAction(customerId);
          setMsg(r.ok ? (r.mocked ? "Win-back drafted (mock send)" : "Win-back email sent ✅") : (r.error ?? "Failed"));
        })}
      >
        <Send size={13} /> {pending ? "Sending…" : "Send AI win-back offer"}
      </button>
      {msg && <p className="mt-1 text-[11px] text-emerald-600">{msg}</p>}
    </div>
  );
}
