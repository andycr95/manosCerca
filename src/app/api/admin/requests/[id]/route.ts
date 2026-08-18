import { NextResponse } from "next/server";
import { AidStatus, Priority } from "@prisma/client";
import { z } from "zod";
import { canManageRequests, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ status: z.nativeEnum(AidStatus), priority: z.nativeEnum(Priority), assignedToId: z.string().optional().or(z.literal("")), scheduledAt: z.string().datetime().optional().or(z.literal("")), comment: z.string().trim().max(1000).optional().or(z.literal("")) });

const requestDetailInclude = {
  beneficiary: true,
  location: true,
  municipality: { select: { name: true, department: { select: { name: true } } } },
  assignedTo: { select: { id: true, name: true, phone: true } },
  createdBy: { select: { name: true } },
  items: { include: { category: true } },
  updates: { orderBy: { createdAt: "desc" as const }, include: { user: { select: { name: true } } } },
  deliveries: { orderBy: { deliveryDate: "desc" as const }, include: { deliveredBy: { select: { name: true } }, items: { include: { inventoryItem: { select: { name: true, unit: true } } } } } },
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await context.params;
  const request = await prisma.aidRequest.findFirst({ where: { id, deletedAt: null }, include: requestDetailInclude });
  if (!request) return NextResponse.json({ error: "La solicitud no existe." }, { status: 404 });
  return NextResponse.json({ request });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!canManageRequests(session.role)) return NextResponse.json({ error: "No tienes permiso para actualizar solicitudes." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Los datos de seguimiento no son válidos." }, { status: 400 });
  const { id } = await context.params;
  const current = await prisma.aidRequest.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "La solicitud no existe." }, { status: 404 });
  const updated = await prisma.aidRequest.update({ where: { id }, data: { status: parsed.data.status, priority: parsed.data.priority, assignedToId: parsed.data.assignedToId || null, scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null, ...(parsed.data.status === AidStatus.DELIVERED ? { completedAt: new Date() } : {}) }, include: { beneficiary: true, location: true, assignedTo: { select: { id: true, name: true } }, items: { include: { category: true } } } });
  if (parsed.data.comment || current.status !== updated.status) await prisma.requestUpdate.create({ data: { aidRequestId: id, userId: session.id, type: current.status !== updated.status ? "STATUS_CHANGE" : "COMMENT", previousStatus: current.status, newStatus: updated.status, comment: parsed.data.comment || null } });
  await prisma.auditLog.create({ data: { userId: session.id, entity: "AidRequest", entityId: id, aidRequestId: id, action: "REQUEST_UPDATED", oldData: { status: current.status, priority: current.priority, assignedToId: current.assignedToId }, newData: { status: updated.status, priority: updated.priority, assignedToId: updated.assignedToId } } });
  return NextResponse.json({ request: updated });
}
