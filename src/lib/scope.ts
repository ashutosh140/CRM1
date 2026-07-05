import type { Prisma, Role } from "@prisma/client";
import { canSeeAll } from "./auth";

/**
 * Per-user data visibility. SUPER_ADMIN / ADMIN / MANAGER see everything;
 * SALES / EMPLOYEE see only records they own or are assigned. Each helper returns
 * a Prisma `where` fragment you can spread/merge into a query.
 */
type U = { id: string; role: Role };

export function leadScope(u: U): Prisma.LeadWhereInput {
  return canSeeAll(u.role) ? {} : { ownerId: u.id };
}

export function customerScope(u: U): Prisma.CustomerWhereInput {
  return canSeeAll(u.role) ? {} : { ownerId: u.id };
}

export function invoiceScope(u: U): Prisma.InvoiceWhereInput {
  return canSeeAll(u.role) ? {} : { customer: { ownerId: u.id } };
}

export function quotationScope(u: U): Prisma.QuotationWhereInput {
  return canSeeAll(u.role) ? {} : { OR: [{ createdById: u.id }, { customer: { ownerId: u.id } }] };
}

export function taskScope(u: U): Prisma.TaskWhereInput {
  return canSeeAll(u.role) ? {} : { OR: [{ creatorId: u.id }, { assigneeId: u.id }] };
}
