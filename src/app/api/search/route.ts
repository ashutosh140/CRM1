import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { leadScope, customerScope, invoiceScope, quotationScope, taskScope } from "@/lib/scope";

export const dynamic = "force-dynamic";

/** GET /api/search?q=... — global, role-scoped search across the CRM. */
export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ groups: [] }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ groups: [] });

  const like = { contains: q, mode: "insensitive" as const };
  const take = 5;

  const [leads, customers, quotations, invoices, tasks] = await Promise.all([
    prisma.lead.findMany({
      where: { AND: [leadScope(me), { OR: [{ name: like }, { company: like }, { email: like }, { phone: like }, { code: like }] }] },
      select: { id: true, name: true, company: true, status: true }, take,
    }),
    prisma.customer.findMany({
      where: { AND: [customerScope(me), { OR: [{ name: like }, { company: like }, { email: like }, { phone: like }] }] },
      select: { id: true, name: true, company: true }, take,
    }),
    prisma.quotation.findMany({
      where: { AND: [quotationScope(me), { OR: [{ number: like }, { customer: { name: like } }] }] },
      select: { id: true, number: true, total: true, customer: { select: { name: true } } }, take,
    }),
    prisma.invoice.findMany({
      where: { AND: [invoiceScope(me), { OR: [{ number: like }, { customer: { name: like } }] }] },
      select: { id: true, number: true, total: true, status: true, customer: { select: { name: true } } }, take,
    }),
    prisma.task.findMany({
      where: { AND: [taskScope(me), { OR: [{ title: like }, { code: like }] }] },
      select: { id: true, title: true, code: true, status: true }, take,
    }),
  ]);

  const groups = [
    {
      label: "Leads",
      items: leads.map((l) => ({ id: l.id, title: l.name, sub: l.company || l.status, href: `/leads/${l.id}` })),
    },
    {
      label: "Customers",
      items: customers.map((c) => ({ id: c.id, title: c.name, sub: c.company || "Customer", href: `/customers/${c.id}` })),
    },
    {
      label: "Quotations",
      items: quotations.map((x) => ({ id: x.id, title: x.number, sub: x.customer.name, href: `/quotations/${x.id}` })),
    },
    {
      label: "Invoices",
      items: invoices.map((x) => ({ id: x.id, title: x.number, sub: `${x.customer.name} · ${x.status}`, href: `/invoices/${x.id}` })),
    },
    {
      label: "Tasks",
      items: tasks.map((t) => ({ id: t.id, title: t.title, sub: `${t.code} · ${t.status}`, href: `/tasks/${t.id}` })),
    },
  ].filter((g) => g.items.length > 0);

  return NextResponse.json({ groups }, { headers: { "Cache-Control": "no-store" } });
}
