import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageRequests, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  beneficiaryName: z.string().trim().min(2).max(120),
  sector: z.string().trim().min(2).max(120),
  need: z.string().trim().min(2).max(180),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!canManageRequests(session.role)) return NextResponse.json({ error: "No tienes permiso para crear solicitudes." }, { status: 403 });
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Completa el nombre, sector y necesidad." }, { status: 400 });

  const municipality = await prisma.municipality.findUnique({ where: { divipolaCode: "76109" } });
  if (!municipality) return NextResponse.json({ error: "No está cargada la ubicación de Buenaventura." }, { status: 400 });
  const [location, category] = await Promise.all([
    prisma.location.findFirst({ where: { municipalityId: municipality.id, name: parsed.data.sector } }),
    prisma.aidCategory.upsert({ where: { name: parsed.data.need }, update: {}, create: { name: parsed.data.need } }),
  ]);
  const last = await prisma.aidRequest.findFirst({ orderBy: { createdAt: "desc" }, select: { code: true } });
  const nextNumber = (last?.code.match(/(\d+)$/)?.[1] ? Number(last.code.match(/(\d+)$/)?.[1]) + 1 : 1).toString().padStart(6, "0");
  const beneficiary = await prisma.beneficiary.create({ data: { name: parsed.data.beneficiaryName, type: "PERSON", municipalityId: municipality.id, locationId: location?.id } });
  const created = await prisma.aidRequest.create({
    data: { code: `AYU-${new Date().getFullYear()}-${nextNumber}`, source: "INTERNAL", beneficiaryId: beneficiary.id, municipalityId: municipality.id, locationId: location?.id, contactName: beneficiary.name, contactPhone: "Pendiente", createdById: session.id, description: parsed.data.need, items: { create: [{ categoryId: category.id }] }, updates: { create: [{ userId: session.id, type: "COMMENT", comment: "Solicitud creada desde el panel interno." }] } },
    include: { beneficiary: true, location: true, items: { include: { category: true } } },
  });
  return NextResponse.json({ request: created }, { status: 201 });
}
