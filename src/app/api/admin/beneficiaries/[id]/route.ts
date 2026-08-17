import { NextResponse } from "next/server";
import { BeneficiaryType } from "@prisma/client";
import { z } from "zod";
import { canManageRequests, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ name: z.string().trim().min(2).max(120), type: z.nativeEnum(BeneficiaryType), documentNumber: z.string().trim().max(30).optional().or(z.literal("")), phone: z.string().trim().max(40).optional().or(z.literal("")), alternativePhone: z.string().trim().max(40).optional().or(z.literal("")), familySize: z.coerce.number().int().min(1).max(100).optional(), address: z.string().trim().max(240).optional().or(z.literal("")), locationName: z.string().trim().max(120).optional().or(z.literal("")), notes: z.string().trim().max(1000).optional().or(z.literal("")), active: z.boolean() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!canManageRequests(session.role)) return NextResponse.json({ error: "No tienes permiso para editar beneficiarios." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revisa los datos." }, { status: 400 });
  const { id } = await context.params;
  const current = await prisma.beneficiary.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "El beneficiario no existe." }, { status: 404 });
  const municipality = await prisma.municipality.findUnique({ where: { divipolaCode: "76109" } });
  const location = parsed.data.locationName ? await prisma.location.findFirst({ where: { municipalityId: municipality?.id, name: parsed.data.locationName } }) : null;
  const beneficiary = await prisma.beneficiary.update({ where: { id }, data: { name: parsed.data.name, type: parsed.data.type, documentNumber: parsed.data.documentNumber || null, phone: parsed.data.phone || null, alternativePhone: parsed.data.alternativePhone || null, familySize: parsed.data.familySize, address: parsed.data.address || null, notes: parsed.data.notes || null, active: parsed.data.active, deletedAt: parsed.data.active ? null : new Date(), locationId: location?.id }, include: { location: true, municipality: { select: { name: true } } } });
  await prisma.auditLog.create({ data: { userId: session.id, entity: "Beneficiary", entityId: beneficiary.id, action: "BENEFICIARY_UPDATED", oldData: { name: current.name, active: current.active }, newData: { name: beneficiary.name, active: beneficiary.active } } });
  return NextResponse.json({ beneficiary });
}
