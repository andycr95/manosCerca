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
  municipalityCode: z.string().trim().min(4).max(8),
  areaType: z.enum(["urban", "rural"]),
  locationName: z.string().trim().min(2).max(180),
  parentLocationName: z.string().trim().max(180).optional(),
  reference: z.string().trim().max(300).optional(),
});

export async function POST(request: Request) {
  const result = requestSchema.safeParse(await request.json());
  if (!result.success) return NextResponse.json({ error: "Revisa los datos e inténtalo nuevamente." }, { status: 400 });

  const data = result.data;
  const municipality = await prisma.municipality.findUnique({ where: { divipolaCode: data.municipalityCode } });
  if (!municipality) return NextResponse.json({ error: "No encontramos el municipio seleccionado." }, { status: 400 });

  const categories = await prisma.aidCategory.findMany({ where: { name: { in: data.needs } } });
  if (categories.length !== data.needs.length) return NextResponse.json({ error: "Una de las ayudas seleccionadas no es válida." }, { status: 400 });

  const location = await prisma.location.findFirst({
    where: { municipalityId: municipality.id, name: data.locationName },
  }) ?? await prisma.location.create({
    data: {
      name: data.locationName,
      type: data.areaType === "urban" ? "NEIGHBORHOOD" : "VILLAGE",
      city: municipality.name,
      municipalityId: municipality.id,
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
  await prisma.auditLog.create({ data: { entity: "AidRequest", entityId: aidRequest.id, action: "PUBLIC_REQUEST_CREATED", newData: { code: aidRequest.code, municipalityCode: data.municipalityCode } } });
  return NextResponse.json({ code: aidRequest.code }, { status: 201 });
}
