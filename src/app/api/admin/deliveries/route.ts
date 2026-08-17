import { AidStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canRegisterDelivery, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const deliverySchema = z.object({
  aidRequestId: z.string().min(1).optional().or(z.literal("")),
  receivedBy: z.string().trim().min(2).max(120),
  receiverDocument: z.string().trim().max(30).optional().or(z.literal("")),
  deliveryDate: z.string().datetime().optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  items: z.array(z.object({ inventoryItemId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(1000000) })).min(1, "Agrega al menos un artículo del inventario."),
});

class StockError extends Error {}

const deliveryInclude = {
  aidRequest: { include: { beneficiary: true, location: true } },
  deliveredBy: { select: { name: true } },
  items: { include: { inventoryItem: { select: { id: true, name: true, unit: true } } } },
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const deliveries = await prisma.delivery.findMany({ where: { deletedAt: null }, orderBy: { deliveryDate: "desc" }, include: deliveryInclude });
  return NextResponse.json({ deliveries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!canRegisterDelivery(session.role)) return NextResponse.json({ error: "No tienes permiso para registrar entregas." }, { status: 403 });
  const parsed = deliverySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revisa los datos de la entrega." }, { status: 400 });

  const requestedId = parsed.data.aidRequestId || null;
  const aidRequest = requestedId ? await prisma.aidRequest.findUnique({ where: { id: requestedId } }) : null;
  if (requestedId && !aidRequest) return NextResponse.json({ error: "La solicitud no existe." }, { status: 404 });
  if (aidRequest?.status === AidStatus.DELIVERED) return NextResponse.json({ error: "Esta solicitud ya está marcada como entregada." }, { status: 409 });

  const quantities = new Map<string, number>();
  for (const item of parsed.data.items) quantities.set(item.inventoryItemId, (quantities.get(item.inventoryItemId) || 0) + item.quantity);
  const stockItems = await prisma.inventoryItem.findMany({ where: { id: { in: [...quantities.keys()] }, active: true }, select: { id: true, name: true, quantity: true } });
  if (stockItems.length !== quantities.size) return NextResponse.json({ error: "Uno de los artículos ya no está disponible en el inventario." }, { status: 400 });
  for (const item of stockItems) if (item.quantity < (quantities.get(item.id) || 0)) return NextResponse.json({ error: `No hay existencias suficientes de ${item.name}.` }, { status: 400 });

  try {
    const delivery = await prisma.$transaction(async (tx) => {
      const created = await tx.delivery.create({ data: { aidRequestId: aidRequest?.id || null, deliveredById: session.id, receivedBy: parsed.data.receivedBy, receiverDocument: parsed.data.receiverDocument || null, deliveryDate: parsed.data.deliveryDate ? new Date(parsed.data.deliveryDate) : new Date(), notes: parsed.data.notes || null, items: { create: parsed.data.items.map((item) => ({ inventoryItemId: item.inventoryItemId, quantity: item.quantity })) } } });
      for (const stockItem of stockItems) {
        const amount = quantities.get(stockItem.id)!;
        const updated = await tx.inventoryItem.updateMany({ where: { id: stockItem.id, active: true, quantity: { gte: amount } }, data: { quantity: { decrement: amount } } });
        if (updated.count !== 1) throw new StockError(`No hay existencias suficientes de ${stockItem.name}.`);
        await tx.inventoryTransaction.create({ data: { inventoryItemId: stockItem.id, userId: session.id, type: "OUTBOUND", quantity: amount, previousQuantity: stockItem.quantity, newQuantity: stockItem.quantity - amount, reason: aidRequest ? `Entrega para solicitud ${aidRequest.code}` : `Entrega directa a ${parsed.data.receivedBy}`, reference: created.id } });
      }
      if (aidRequest) {
        await tx.aidRequest.update({ where: { id: aidRequest.id }, data: { status: AidStatus.DELIVERED, completedAt: created.deliveryDate } });
        await tx.requestUpdate.create({ data: { aidRequestId: aidRequest.id, userId: session.id, type: "STATUS_CHANGE", previousStatus: aidRequest.status, newStatus: AidStatus.DELIVERED, comment: "Entrega registrada y descontada del inventario." } });
      }
      await tx.auditLog.create({ data: { userId: session.id, entity: "Delivery", entityId: created.id, action: aidRequest ? "DELIVERY_CREATED" : "DIRECT_DELIVERY_CREATED", newData: { aidRequestId: aidRequest?.id || null, receivedBy: created.receivedBy, items: [...quantities.entries()].map(([inventoryItemId, quantity]) => ({ inventoryItemId, quantity })) } } });
      return tx.delivery.findUniqueOrThrow({ where: { id: created.id }, include: deliveryInclude });
    });
    return NextResponse.json({ delivery }, { status: 201 });
  } catch (error) {
    if (error instanceof StockError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "No fue posible registrar la entrega." }, { status: 500 });
  }
}
