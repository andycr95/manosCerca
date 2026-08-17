import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const initialItems = [
  { sku: "KIT-MERCADO", name: "Mercado básico", category: "Alimentos", unit: "kit", quantity: 24, minStock: 8, location: "Bodega principal" },
  { sku: "MED-BASICOS", name: "Medicamentos básicos", category: "Salud", unit: "unidad", quantity: 40, minStock: 12, location: "Botiquín" },
  { sku: "COLCHONETA", name: "Colchonetas", category: "Alojamiento", unit: "unidad", quantity: 8, minStock: 3, location: "Bodega principal" },
  { sku: "AGUA-20L", name: "Agua potable", category: "Agua", unit: "garrafa", quantity: 60, minStock: 15, location: "Bodega principal" },
  { sku: "ASEO-KIT", name: "Kits de aseo", category: "Higiene", unit: "kit", quantity: 18, minStock: 6, location: "Bodega principal" },
];

async function main() {
  for (const item of initialItems) {
    const existing = await prisma.inventoryItem.findUnique({ where: { sku: item.sku } });
    if (existing) continue;
    const created = await prisma.inventoryItem.create({ data: item });
    if (item.quantity > 0) {
      await prisma.inventoryTransaction.create({ data: { inventoryItemId: created.id, type: "INBOUND", quantity: item.quantity, previousQuantity: 0, newQuantity: item.quantity, reason: "Carga inicial del inventario" } });
    }
  }
  console.log(`Inventario inicial listo: ${initialItems.length} artículos disponibles.`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => prisma.$disconnect());
