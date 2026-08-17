import { NextResponse } from "next/server";
import { AidStatus, Priority } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const monthStart = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const [requests, beneficiaries, users, deliveries, updates, urgentCount, pendingCount, inProgressCount, scheduledCount, deliveredCount] = await Promise.all([
    prisma.aidRequest.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { beneficiary: true, location: true, assignedTo: { select: { id: true, name: true } }, items: { include: { category: true } } },
    }),
    prisma.beneficiary.findMany({ where: { deletedAt: null, active: true }, orderBy: { createdAt: "desc" }, take: 80, include: { location: true, municipality: { select: { name: true } } } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true, phone: true, role: true, active: true, createdAt: true } }),
    prisma.delivery.findMany({ where: { deletedAt: null }, orderBy: { deliveryDate: "desc" }, take: 80, include: { aidRequest: { include: { beneficiary: true, location: true } }, deliveredBy: { select: { name: true } }, items: { include: { inventoryItem: { select: { id: true, name: true, unit: true } } } } } }),
    prisma.requestUpdate.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { user: { select: { name: true } }, aidRequest: { select: { code: true, beneficiary: { select: { name: true } } } } } }),
    prisma.aidRequest.count({ where: { deletedAt: null, priority: Priority.URGENT, status: { not: AidStatus.DELIVERED } } }),
    prisma.aidRequest.count({ where: { deletedAt: null, status: AidStatus.PENDING } }),
    prisma.aidRequest.count({ where: { deletedAt: null, status: AidStatus.IN_PROGRESS } }),
    prisma.aidRequest.count({ where: { deletedAt: null, status: AidStatus.SCHEDULED } }),
    prisma.aidRequest.count({ where: { deletedAt: null, status: AidStatus.DELIVERED, completedAt: { gte: monthStart() } } }),
  ]);

  const sectorCounts = requests.reduce<Record<string, number>>((result, request) => {
    const key = request.location?.name || "Sin sector";
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});

  return NextResponse.json({
    session,
    metrics: { active: requests.filter((request) => !new Set<string>([AidStatus.DELIVERED, AidStatus.CANCELLED, AidStatus.UNABLE_TO_SERVE]).has(request.status)).length, urgent: urgentCount, pending: pendingCount, inProgress: inProgressCount, scheduled: scheduledCount, delivered: deliveredCount },
    requests,
    beneficiaries,
    users,
    deliveries,
    updates,
    sectors: Object.entries(sectorCounts).sort(([, a], [, b]) => b - a).slice(0, 8).map(([name, count]) => ({ name, count })),
  });
}
