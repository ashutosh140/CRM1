import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { customerScope } from "@/lib/scope";
import { PageHeader } from "@/components/ui";
import { QuotationForm } from "@/components/QuotationForm";

export default async function NewQuotationPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const customers = await prisma.customer.findMany({
    where: customerScope(me),
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/quotations" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Back
      </Link>
      <PageHeader title="New Quotation" subtitle="Add line items — totals & tax auto-calculate." />
      {customers.length === 0 ? (
        <p className="card p-6 text-sm text-slate-500">No customers yet. Add a customer first.</p>
      ) : (
        <QuotationForm customers={customers} />
      )}
    </div>
  );
}
