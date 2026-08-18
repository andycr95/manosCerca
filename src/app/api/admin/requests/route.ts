import { LocationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageRequests, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  applicantName: z.string().trim().min(2).max(120),
  documentNumber: z.string().trim().regex(/^\d{5,20}$/, "El documento debe contener entre 5 y 20 dígitos."),
  phone: z.string().trim().min(7).max(30),
  beneficiaryName: z.string().trim().min(2).max(120),
  preferredContact: z.string().trim().max(40).optional().or(z.literal("")),
  needs: z.array(z.string().trim().min(1).max(120)).min(1).max(6),
  details: z.string().trim().max(1500).optional().or(z.literal("")),
  departmentCode: z.string().trim().regex(/^\d{2}$/),
  municipalityCode: z.string().trim().min(4).max(8),
  areaType: z.enum(["urban", "rural"]),
  locationName: z.string().trim().min(2).max(180),
  parentLocationName: z.string().trim().max(180).optional().or(z.literal("")),
  reference: z.string().trim().max(300).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!canManageRequests(session.role)) return NextResponse.json({ error: "No tienes permiso para crear solicitudes." }, { status: 403 });
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Completa los datos obligatorios de la solicitud." }, { status: 400 });
  const data = parsed.data;
  const municipality = await prisma.municipality.findUnique({ where: { divipolaCode: data.municipalityCode }, include: { department: { select: { divipolaCode: true, name: true } } } });
  if (!municipality || municipality.department.divipolaCode !== data.departmentCode) return NextResponse.json({ error: "El municipio no corresponde al departamento seleccionado." }, { status: 400 });
  const parentLocation = data.parentLocationName ? await prisma.location.findFirst({ where: { municipalityId: municipality.id, name: data.parentLocationName } }) ?? await prisma.location.create({ data: { name: data.parentLocationName, type: LocationType.RURAL_AREA, city: municipality.name, department: municipality.department.name, municipalityId: municipality.id } }) : null;
  const location = await prisma.location.findFirst({ where: { municipalityId: municipality.id, name: data.locationName, parentId: parentLocation?.id || null } }) ?? await prisma.location.create({ data: { name: data.locationName, type: data.areaType === "urban" ? LocationType.NEIGHBORHOOD : LocationType.VILLAGE, city: municipality.name, department: municipality.department.name, municipalityId: municipality.id, parentId: parentLocation?.id || null, reference: data.reference || null } });
  const categories = await Promise.all(data.needs.map((name) => prisma.aidCategory.upsert({ where: { name }, update: {}, create: { name } })));
  const last = await prisma.aidRequest.findFirst({ orderBy: { createdAt: "desc" }, select: { code: true } });
  const nextNumber = (last?.code.match(/(\d+)$/)?.[1] ? Number(last.code.match(/(\d+)$/)?.[1]) + 1 : 1).toString().padStart(6, "0");
  const beneficiary = await prisma.beneficiary.create({ data: { name: data.beneficiaryName, documentNumber: data.documentNumber, type: "FAMILY", phone: data.phone, municipalityId: municipality.id, locationId: location.id } });
  const created = await prisma.aidRequest.create({
    data: { code: `AYU-${new Date().getFullYear()}-${nextNumber}`, source: "INTERNAL", beneficiaryId: beneficiary.id, municipalityId: municipality.id, locationId: location.id, contactName: data.applicantName, contactPhone: data.phone, preferredContact: data.preferredContact || null, createdById: session.id, description: data.details || null, notes: data.parentLocationName || null, items: { create: categories.map((category) => ({ categoryId: category.id, quantity: 1, unit: "solicitud" })) }, updates: { create: [{ userId: session.id, type: "COMMENT", comment: "Solicitud completa creada desde el panel interno." }] } },
    include: { beneficiary: true, location: true, items: { include: { category: true } } },
  });
  return NextResponse.json({ request: created }, { status: 201 });
}
