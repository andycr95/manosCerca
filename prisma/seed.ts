import { LocationType, PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import divipola from "../src/data/divipola-municipalities.json";
import { buenaventuraNeighborhoods, buenaventuraRuralAreas } from "../src/data/locations";

const prisma = new PrismaClient();

async function main() {
  const superadminPassword = process.env.SUPERADMIN_PASSWORD;
  if (!superadminPassword || superadminPassword.length < 12) throw new Error("Define SUPERADMIN_PASSWORD con al menos 12 caracteres antes de ejecutar el seed.");
  await prisma.deliveryEvidence.deleteMany();
  await prisma.deliveryItem.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.requestUpdate.deleteMany();
  await prisma.aidRequestItem.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.aidRequest.deleteMany();
  await prisma.beneficiary.deleteMany();
  await prisma.location.deleteMany();
  await prisma.aidCategory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.municipality.deleteMany();
  await prisma.department.deleteMany();

  const uniqueDepartments = Array.from(new Map(divipola.map((item) => [item.cod_dpto, item.dpto])).entries());
  await prisma.department.createMany({ data: uniqueDepartments.map(([divipolaCode, name]) => ({ divipolaCode, name })), skipDuplicates: true });
  const departments = await prisma.department.findMany({ select: { id: true, divipolaCode: true } });
  const departmentIds = new Map(departments.map((item) => [item.divipolaCode, item.id]));

  await prisma.municipality.createMany({
    data: divipola.map((item) => ({
      divipolaCode: item.cod_mpio,
      name: item.nom_mpio,
      entityType: item.tipo_municipio,
      departmentId: departmentIds.get(item.cod_dpto)!,
    })),
    skipDuplicates: true,
  });

  const buenaventura = await prisma.municipality.findUniqueOrThrow({ where: { divipolaCode: "76109" } });
  const locations = await prisma.$transaction(async (tx) => {
    const localityIds = new Map<string, string>();
    for (const locality of ["Isla de la Paz", "El Pailón"]) {
      const location = await tx.location.create({ data: { name: locality, type: LocationType.SECTOR, city: "Buenaventura", department: "Valle del Cauca", municipalityId: buenaventura.id } });
      localityIds.set(locality, location.id);
    }
    await tx.location.createMany({
      data: buenaventuraNeighborhoods.map((item) => ({ name: item.name, type: LocationType.NEIGHBORHOOD, city: "Buenaventura", department: "Valle del Cauca", municipalityId: buenaventura.id, parentId: localityIds.get(item.locality)! })),
    });
    for (const area of buenaventuraRuralAreas) {
      const parent = await tx.location.create({ data: { name: area.district, type: LocationType.RURAL_AREA, city: "Buenaventura", department: "Valle del Cauca", municipalityId: buenaventura.id } });
      await tx.location.createMany({ data: area.villages.map((name) => ({ name, type: LocationType.VILLAGE, city: "Buenaventura", department: "Valle del Cauca", municipalityId: buenaventura.id, parentId: parent.id })) });
    }
    return localityIds;
  }, { maxWait: 30_000, timeout: 180_000 });

  const categoryNames = ["Mercado o alimentos", "Agua potable", "Medicamentos", "Ropa", "Elementos de aseo", "Otro"];
  await prisma.aidCategory.createMany({ data: categoryNames.map((name) => ({ name })), skipDuplicates: true });
  const categories = await prisma.aidCategory.findMany();
  const marketCategory = categories.find((item) => item.name === "Mercado o alimentos")!;

  const localPasswordHash = await hash("Colabora2026!", 12);
  const [superadmin, admin, leader, collaborator] = await Promise.all([
    prisma.user.create({ data: { name: "Superadministrador", documentNumber: "1000000001", email: "superadmin@turaayuda.local", phone: "300 000 0000", passwordHash: await hash(superadminPassword, 12), role: Role.SUPERADMIN } }),
    prisma.user.create({ data: { name: "María Rentería", documentNumber: "1000000002", email: "admin@turaayuda.local", phone: "300 000 0001", passwordHash: localPasswordHash, role: Role.ADMIN } }),
    prisma.user.create({ data: { name: "Carlos Mina", documentNumber: "1000000003", email: "lider@turaayuda.local", phone: "300 000 0002", passwordHash: localPasswordHash, role: Role.LEADER } }),
    prisma.user.create({ data: { name: "Ana Valencia", documentNumber: "1000000004", email: "colaborador@turaayuda.local", phone: "300 000 0003", passwordHash: localPasswordHash, role: Role.COLLABORATOR } }),
  ]);

  await prisma.inventoryItem.createMany({ data: [
    { sku: "KIT-MERCADO", name: "Mercado básico", category: "Alimentos", unit: "kit", quantity: 24, minStock: 8, location: "Bodega principal" },
    { sku: "MED-BASICOS", name: "Medicamentos básicos", category: "Salud", unit: "unidad", quantity: 40, minStock: 12, location: "Botiquín" },
    { sku: "COLCHONETA", name: "Colchonetas", category: "Alojamiento", unit: "unidad", quantity: 8, minStock: 3, location: "Bodega principal" },
    { sku: "AGUA-20L", name: "Agua potable", category: "Agua", unit: "garrafa", quantity: 60, minStock: 15, location: "Bodega principal" },
    { sku: "ASEO-KIT", name: "Kits de aseo", category: "Higiene", unit: "kit", quantity: 18, minStock: 6, location: "Bodega principal" },
  ] });

  const firstNeighborhood = await prisma.location.findFirstOrThrow({ where: { municipalityId: buenaventura.id, type: LocationType.NEIGHBORHOOD } });
  const beneficiary = await prisma.beneficiary.create({ data: { name: "Familia Riascos", type: "FAMILY", phone: "300 123 4567", municipalityId: buenaventura.id, locationId: firstNeighborhood.id, familySize: 4 } });
  await prisma.aidRequest.create({
    data: {
      code: "AYU-2026-000001",
      source: "INTERNAL",
      beneficiaryId: beneficiary.id,
      locationId: firstNeighborhood.id,
      municipalityId: buenaventura.id,
      contactName: beneficiary.name,
      contactPhone: beneficiary.phone!,
      description: "Solicitud de prueba creada por el seed local.",
      priority: "HIGH",
      status: "PENDING",
      createdById: admin.id,
      assignedToId: collaborator.id,
      items: { create: [{ categoryId: marketCategory.id, quantity: 2, unit: "mercados" }] },
      updates: { create: [{ userId: leader.id, type: "COMMENT", comment: "Caso creado para pruebas locales." }] },
    },
  });

  await prisma.auditLog.create({ data: { userId: superadmin.id, entity: "User", entityId: superadmin.id, action: "SEED_SUPERADMIN_CREATED", newData: { email: superadmin.email, role: superadmin.role } } });

  console.log(`Seed listo: ${uniqueDepartments.length} departamentos, ${divipola.length} entidades DIVIPOLA, ${buenaventuraNeighborhoods.length} barrios y ${buenaventuraRuralAreas.flatMap((item) => item.villages).length} veredas/registros rurales de Buenaventura.`);
  void locations;
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => prisma.$disconnect());
