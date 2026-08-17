import { AidStatus, LocationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  applicantName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  beneficiaryName: z.string().trim().min(2).max(120),
  preferredContact: z.string().trim().max(40).optional(),
  needs: z.array(z.string().trim().min(1)).min(1).max(6),
  details: z.string().trim().max(1500).optional(),
  departmentCode: z.string().trim().regex(/^\d{2}$/, "Selecciona un departamento válido."),
  municipalityCode: z.string().trim().min(4).max(8),
  areaType: z.enum(["urban", "rural"]),
  locationName: z.string().trim().min(2).max(180),
  parentLocationName: z.string().trim().max(180).optional(),
  reference: z.string().trim().max(300).optional(),
});

const trackingCodeSchema = z.string().trim().toUpperCase().regex(/^AYU-\d{4}-\d{6}$/, "Ingresa un número de radicado válido.");
const publicStatus: Record<AidStatus, { label: string; message: string }> = {
  PENDING: { label: "Recibida", message: "Recibimos tu solicitud y el equipo la revisará pronto." },
  IN_PROGRESS: { label: "En gestión", message: "El equipo está revisando opciones para atender tu solicitud." },
  SCHEDULED: { label: "Programada", message: "Tu ayuda tiene una gestión o entrega programada." },
  DELIVERED: { label: "Entregada", message: "La ayuda fue registrada como entregada." },
  CANCELLED: { label: "Cancelada", message: "La solicitud fue cerrada. Si necesitas apoyo, puedes registrar una nueva." },
  UNABLE_TO_SERVE: { label: "No atendida", message: "Por ahora no fue posible atender la solicitud. Puedes comunicarte con la red para conocer alternativas." },
};

export async function GET(request: Request) {
  const rawCode = new URL(request.url).searchParams.get("code") || "";
  const parsed = trackingCodeSchema.safeParse(rawCode);
  if (!parsed.success) return NextResponse.json({ error: "Ingresa un número de radicado válido." }, { status: 400 });
  const aidRequest = await prisma.aidRequest.findFirst({ where: { code: parsed.data, source: "PUBLIC", deletedAt: null }, select: { code: true, status: true, requestedAt: true, scheduledAt: true, completedAt: true, updatedAt: true } });
  if (!aidRequest) return NextResponse.json({ error: "No encontramos una solicitud con ese radicado." }, { status: 404 });
  return NextResponse.json({ tracking: { code: aidRequest.code, status: aidRequest.status, statusLabel: publicStatus[aidRequest.status].label, message: publicStatus[aidRequest.status].message, requestedAt: aidRequest.requestedAt, scheduledAt: aidRequest.scheduledAt, completedAt: aidRequest.completedAt, updatedAt: aidRequest.updatedAt } });
}

export async function POST(request: Request) {
  const result = requestSchema.safeParse(await request.json());
  if (!result.success) return NextResponse.json({ error: "Revisa los datos e inténtalo nuevamente." }, { status: 400 });

  const data = result.data;
  const municipality = await prisma.municipality.findUnique({ where: { divipolaCode: data.municipalityCode }, include: { department: { select: { divipolaCode: true, name: true } } } });
  if (!municipality || municipality.department.divipolaCode !== data.departmentCode) return NextResponse.json({ error: "El municipio no corresponde al departamento seleccionado." }, { status: 400 });

  const categories = await prisma.aidCategory.findMany({ where: { name: { in: data.needs } } });
  if (categories.length !== data.needs.length) return NextResponse.json({ error: "Una de las ayudas seleccionadas no es válida." }, { status: 400 });

  const parentLocation = data.parentLocationName ? await prisma.location.findFirst({ where: { municipalityId: municipality.id, name: data.parentLocationName } }) ?? await prisma.location.create({
    data: { name: data.parentLocationName, type: LocationType.RURAL_AREA, city: municipality.name, department: municipality.department.name, municipalityId: municipality.id },
  }) : null;
  const location = await prisma.location.findFirst({
    where: { municipalityId: municipality.id, name: data.locationName, parentId: parentLocation?.id || null },
  }) ?? await prisma.location.create({
    data: {
      name: data.locationName,
      type: data.areaType === "urban" ? LocationType.NEIGHBORHOOD : LocationType.VILLAGE,
      city: municipality.name,
      municipalityId: municipality.id,
      parentId: parentLocation?.id || null,
      reference: data.reference || null,
    },
  });

  const beneficiary = await prisma.beneficiary.create({
    data: { name: data.beneficiaryName, type: "FAMILY", phone: data.phone, municipalityId: municipality.id, locationId: location.id },
  });
  const currentYear = new Date().getFullYear();
  const latest = await prisma.aidRequest.count();
  const code = `AYU-${currentYear}-${String(latest + 1).padStart(6, "0")}`;
  const aidRequest = await prisma.aidRequest.create({
    data: {
      code,
      source: "PUBLIC",
      beneficiaryId: beneficiary.id,
      locationId: location.id,
      municipalityId: municipality.id,
      contactName: data.applicantName,
      contactPhone: data.phone,
      preferredContact: data.preferredContact,
      description: data.details || null,
      notes: data.parentLocationName || null,
      items: { create: categories.map((category) => ({ categoryId: category.id, quantity: 1, unit: "solicitud" })) },
      updates: { create: { type: "COMMENT", comment: "Solicitud recibida desde el formulario público." } },
    },
  });
  await prisma.auditLog.create({ data: { entity: "AidRequest", entityId: aidRequest.id, action: "PUBLIC_REQUEST_CREATED", newData: { code: aidRequest.code, departmentCode: data.departmentCode, municipalityCode: data.municipalityCode } } });
  return NextResponse.json({ code: aidRequest.code }, { status: 201 });
}
