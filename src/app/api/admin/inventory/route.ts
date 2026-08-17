import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageRequests, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const itemSchema = z.object({
  sku: z.string().trim().regex(/^[A-Za-z0-9-]{3,40}$/, "El SKU solo puede contener letras, números y guiones."),
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(80),
  unit: z.string().trim().min(1).max(30),
  quantity: z.coerce.number().int().min(0).max(1000000),
  minStock: z.coerce.number().int().min(0).max(1000000),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

const transactionInclude = { transactions: { orderBy: { createdAt: "desc" as const }, take: 10, include: { user: { select: { name: true } } } } };

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const items = await prisma.inventoryItem.findMany({ orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }], include: transactionInclude });
  return NextResponse.json({ items: items.map((item) => ({ ...item, status: item.quantity <= 0 ? "SIN_STOCK" : item.quantity <= item.minStock ? "LOW" : "OK" })) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!canManageRequests(session.role)) return NextResponse.json({ error: "No tienes permiso para administrar el inventario." }, { status: 403 });
  const parsed = itemSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revisa los datos del artículo." }, { status: 400 });
  try {
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryItem.create({ data: { ...parsed.data, location: parsed.data.location || null, notes: parsed.data.notes || null } });
      if (parsed.data.quantity > 0) await tx.inventoryTransaction.create({ data: { inventoryItemId: created.id, userId: session.id, type: "INBOUND", quantity: parsed.data.quantity, previousQuantity: 0, newQuantity: parsed.data.quantity, reason: "Existencia inicial" } });
      await tx.auditLog.create({ data: { userId: session.id, entity: "InventoryItem", entityId: created.id, action: "INVENTORY_ITEM_CREATED", newData: { sku: created.sku, name: created.name, quantity: created.quantity } } });
      return tx.inventoryItem.findUniqueOrThrow({ where: { id: created.id }, include: transactionInclude });
    });
    return NextResponse.json({ item: { ...item, status: item.quantity <= 0 ? "SIN_STOCK" : item.quantity <= item.minStock ? "LOW" : "OK" } }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "El SKU ya está registrado." }, { status: 409 });
    return NextResponse.json({ error: "No fue posible crear el artículo." }, { status: 500 });
  }
}
