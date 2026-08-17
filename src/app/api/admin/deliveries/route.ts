import { NextResponse } from "next/server";
import { AidStatus } from "@prisma/client";
import { z } from "zod";
import { canRegisterDelivery, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const deliverySchema = z.object({ aidRequestId: z.string().min(1), receivedBy: z.string().trim().min(2).max(120), receiverDocument: z.string().trim().max(30).optional().or(z.literal("")), deliveryDate: z.string().datetime().optional(), notes: z.string().trim().max(1000).optional().or(z.literal("")) });

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const deliveries = await prisma.delivery.findMany({ where: { deletedAt: null }, orderBy: { deliveryDate: "desc" }, include: { aidRequest: { include: { beneficiary: true, location: true } }, deliveredBy: { select: { name: true } }, items: true } });
  return NextResponse.json({ deliveries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!canRegisterDelivery(session.role)) return NextResponse.json({ error: "No tienes permiso para registrar entregas." }, { status: 403 });
  const parsed = deliverySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revisa los datos de la entrega." }, { status: 400 });
  const aidRequest = await prisma.aidRequest.findUnique({ where: { id: parsed.data.aidRequestId }, include: { items: true } });
  if (!aidRequest) return NextResponse.json({ error: "La solicitud no existe." }, { status: 404 });
  if (aidRequest.status === AidStatus.DELIVERED) return NextResponse.json({ error: "Esta solicitud ya está marcada como entregada." }, { status: 409 });
  const delivery = await prisma.$transaction(async (tx) => {
    const created = await tx.delivery.create({ data: { aidRequestId: aidRequest.id, deliveredById: session.id, receivedBy: parsed.data.receivedBy, receiverDocument: parsed.data.receiverDocument || null, deliveryDate: parsed.data.deliveryDate ? new Date(parsed.data.deliveryDate) : new Date(), notes: parsed.data.notes || null, items: { create: aidRequest.items.map((item) => ({ requestItemId: item.id, quantity: item.quantity })) } }, include: { aidRequest: { include: { beneficiary: true, location: true } }, deliveredBy: { select: { name: true } }, items: true } });
    await tx.aidRequest.update({ where: { id: aidRequest.id }, data: { status: AidStatus.DELIVERED, completedAt: created.deliveryDate } });
    await tx.requestUpdate.create({ data: { aidRequestId: aidRequest.id, userId: session.id, type: "STATUS_CHANGE", previousStatus: aidRequest.status, newStatus: AidStatus.DELIVERED, comment: "Entrega registrada desde el módulo de entregas." } });
    return created;
  });
  await prisma.auditLog.create({ data: { userId: session.id, entity: "Delivery", entityId: delivery.id, action: "DELIVERY_CREATED", newData: { aidRequestId: aidRequest.id, receivedBy: delivery.receivedBy } } });
  return NextResponse.json({ delivery }, { status: 201 });
}
