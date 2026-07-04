"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail, Phone, Building2, Globe, Pencil, Trash2, Send, X, Save,
} from "lucide-react";
import {
  updateLeadAction, deleteLeadAction, sendLeadWelcomeEmailAction,
} from "@/app/actions/leads";
import { Card, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

const SOURCES = ["MANUAL", "WEBSITE", "WHATSAPP", "EMAIL", "FACEBOOK", "INSTAGRAM", "PHONE", "REFERRAL"];
const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

export interface LeadData {
  id: string; name: string; company: string | null; email: string | null; phone: string | null;
  altPhone: string | null; source: string; status: string; estimatedValue: number;
  website: string | null; facebook: string | null; instagram: string | null; twitter: string | null;
  otherLinks: string | null; heroProducts: string | null; contractMonths: number | null;
  onboardedAt: string | null; inquiryReason: string | null; productRequirement: string | null;
  stageName: string | null; ownerName: string | null;
}

export function LeadEditor({ lead }: { lead: LeadData }) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [state, formAction, saving] = useActionState(async (p: unknown, fd: FormData) => {
    const r = await updateLeadAction(p, fd);
    if (r?.ok) { setEditing(false); router.refresh(); }
    return r;
  }, null);

  function sendEmail() {
    start(async () => {
      const r = await sendLeadWelcomeEmailAction(lead.id);
      setMsg(r?.ok ? (r.mocked ? "Welcome email queued (mock — set BREVO_API_KEY)" : "Welcome email + PDF sent ✅") : (r?.error || "Failed"));
    });
  }
  function del() {
    if (!confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) return;
    start(() => deleteLeadAction(lead.id));
  }

  if (editing) {
    return (
      <Card>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={lead.id} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <F label="Name" name="name" def={lead.name} required />
            <F label="Company" name="company" def={lead.company} />
            <F label="Email" name="email" type="email" def={lead.email} />
            <F label="Phone" name="phone" def={lead.phone} />
            <F label="Alternate Mobile" name="altPhone" def={lead.altPhone} />
            <div>
              <label className="label">Source</label>
              <select name="source" defaultValue={lead.source} className="input">
                {SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" defaultValue={lead.status} className="input">
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <F label="Estimated Value (₹)" name="estimatedValue" type="number" def={lead.estimatedValue} />
            <F label="Website" name="website" def={lead.website} />
            <F label="Facebook" name="facebook" def={lead.facebook} />
            <F label="Instagram" name="instagram" def={lead.instagram} />
            <F label="Twitter / X" name="twitter" def={lead.twitter} />
            <F label="Hero Products" name="heroProducts" def={lead.heroProducts} />
            <F label="Other Links" name="otherLinks" def={lead.otherLinks} />
            <F label="Contract (months)" name="contractMonths" type="number" def={lead.contractMonths} />
            <F label="Onboarded On" name="onboardedAt" type="date" def={lead.onboardedAt?.slice(0, 10) ?? null} />
          </div>
          <div>
            <label className="label">Reason for Inquiry</label>
            <textarea name="inquiryReason" rows={2} className="input" defaultValue={lead.inquiryReason ?? ""} />
          </div>
          <div>
            <label className="label">Nature of Work / Requirement</label>
            <textarea name="productRequirement" rows={3} className="input" defaultValue={lead.productRequirement ?? ""} />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost"><X size={15} /> Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}><Save size={15} /> {saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <button onClick={sendEmail} disabled={pending} className="btn-ghost text-sm"><Send size={15} /> Send Welcome Email</button>
        <button onClick={() => setEditing(true)} className="btn-ghost text-sm"><Pencil size={15} /> Edit</button>
        <button onClick={del} disabled={pending} className="btn-ghost text-sm text-rose-600"><Trash2 size={15} /> Delete</button>
      </div>
      {msg && <p className="mb-3 text-sm text-emerald-600">{msg}</p>}

      <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <Info icon={<Building2 size={15} />} label="Company" value={lead.company} />
        <Info icon={<Mail size={15} />} label="Email" value={lead.email} />
        <Info icon={<Phone size={15} />} label="Phone" value={lead.phone} />
        <Info icon={<Phone size={15} />} label="Alt. Mobile" value={lead.altPhone} />
        <div><p className="text-xs text-slate-400">Source</p><Badge value={lead.source} /></div>
        <div><p className="text-xs text-slate-400">Status</p><Badge value={lead.status} /></div>
        <Info label="Value" value={formatCurrency(lead.estimatedValue)} />
        <Info label="Contract" value={lead.contractMonths ? `${lead.contractMonths} months` : null} />
      </div>

      {(lead.website || lead.facebook || lead.instagram || lead.twitter || lead.otherLinks) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {lead.website && <LinkChip icon={<Globe size={13} />} href={lead.website} label="Website" />}
          {lead.facebook && <LinkChip href={lead.facebook} label="Facebook" />}
          {lead.instagram && <LinkChip href={lead.instagram} label="Instagram" />}
          {lead.twitter && <LinkChip href={lead.twitter} label="Twitter" />}
          {lead.otherLinks && <span className="badge bg-slate-100 text-slate-600">{lead.otherLinks}</span>}
        </div>
      )}

      {lead.heroProducts && <Block label="Hero Products" text={lead.heroProducts} />}
      {lead.inquiryReason && <Block label="Reason for Inquiry" text={lead.inquiryReason} />}
      {lead.productRequirement && <Block label="Nature of Work / Requirement" text={lead.productRequirement} />}

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
        <span>Stage: {lead.stageName ?? "—"}</span>
        <span>Owner: {lead.ownerName ?? "Unassigned"}</span>
        {lead.onboardedAt && <span>Onboarded: {new Date(lead.onboardedAt).toLocaleDateString("en-IN")}</span>}
      </div>
    </Card>
  );
}

function F({ label, name, def, type = "text", required }: { label: string; name: string; def: string | number | null; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input name={name} type={type} defaultValue={def ?? ""} required={required} className="input" />
    </div>
  );
}
function Info({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | null }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-slate-400">{icon} {label}</p>
      <p className="mt-0.5 truncate text-slate-700">{value || "—"}</p>
    </div>
  );
}
function Block({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
      <p className="mb-1 text-xs font-medium text-slate-400">{label}</p>
      {text}
    </div>
  );
}
function LinkChip({ icon, href, label }: { icon?: React.ReactNode; href: string; label: string }) {
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="badge border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100">
      {icon} {label}
    </a>
  );
}
