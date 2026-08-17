import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageRequests, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(80),
  unit: z.string().trim().min(1).max(30),
  minStock: z.coerce.number().int().min(0).max(1000000),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  active: z.boolean().optional(),
  movementType: z.enum(["INBOUND", "OUTBOUND", "ADJUSTMENT"]).optional(),
  movementQuantity: z.coerce.number().int().min(0).max(1000000).optional(),
  reason: z.string().trim().max(240).optional().or(z.literal("")),
});

const transactionInclude = { transactions: { orderBy: { createdAt: "desc" as const }, take: 10, include: { user: { select: { name: true } } } } };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!canManageRequests(session.role)) return NextResponse.json({ error: "No tienes permiso para administrar el inventario." }, { status: 403 });
  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revisa los datos del artículo." }, { status: 400 });
  const current = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
  const movementQuantity = parsed.data.movementQuantity ?? 0;
  let nextQuantity = current.quantity;
  if (parsed.data.movementType === "INBOUND") nextQuantity += movementQuantity;
  if (parsed.data.movementType === "OUTBOUND") {
    if (movementQuantity > current.quantity) return NextResponse.json({ error: "La salida no puede superar la existencia disponible." }, { status: 400 });
    nextQuantity -= movementQuantity;
  }
  if (parsed.data.movementType === "ADJUSTMENT") nextQuantity = movementQuantity;
  try {
    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({ where: { id }, data: { name: parsed.data.name, category: parsed.data.category, unit: parsed.data.unit, minStock: parsed.data.minStock, location: parsed.data.location || null, notes: parsed.data.notes || null, active: parsed.data.active ?? current.active, quantity: nextQuantity } });
      if (parsed.data.movementType) await tx.inventoryTransaction.create({ data: { inventoryItemId: id, userId: session.id, type: parsed.data.movementType, quantity: movementQuantity, previousQuantity: current.quantity, newQuantity: nextQuantity, reason: parsed.data.reason || null } });
      await tx.auditLog.create({ data: { userId: session.id, entity: "InventoryItem", entityId: id, action: parsed.data.movementType ? `INVENTORY_${parsed.data.movementType}` : "INVENTORY_ITEM_UPDATED", oldData: { quantity: current.quantity, active: current.active }, newData: { quantity: nextQuantity, active: updated.active } } });
      return tx.inventoryItem.findUniqueOrThrow({ where: { id }, include: transactionInclude });
    });
    return NextResponse.json({ item: { ...item, status: item.quantity <= 0 ? "SIN_STOCK" : item.quantity <= item.minStock ? "LOW" : "OK" } });
  } catch {
    return NextResponse.json({ error: "No fue posible actualizar el artículo." }, { status: 500 });
  }
}
