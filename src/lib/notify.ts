import { prisma } from "./prisma";

/** Create an in-app notification for a user. */
export async function notify(userId: string | null | undefined, title: string, body?: string, link?: string) {
  if (!userId) return;
  await prisma.notification.create({ data: { userId, title, body: body ?? null, link: link ?? null } }).catch(() => {});
}

/** Notify several users at once. */
export async function notifyMany(userIds: string[], title: string, body?: string, link?: string) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return;
  await prisma.notification.createMany({
    data: ids.map((userId) => ({ userId, title, body: body ?? null, link: link ?? null })),
  }).catch(() => {});
}
