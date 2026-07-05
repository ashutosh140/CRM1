import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { CustomerForm } from "@/components/CustomerForm";

export default async function NewCustomerPage() {
  const users = await prisma.user.findMany({
    where: { role: { in: ["SALES", "MANAGER", "ADMIN"] }, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/customers" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Back to customers
      </Link>
      <PageHeader title="Add Customer" subtitle="Add a client who is doing business with you (a converted lead)." />
      <CustomerForm users={users} />
    </div>
  );
}
