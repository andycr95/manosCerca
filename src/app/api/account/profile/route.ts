import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { createSessionToken, getSession, sessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(254), phone: z.string().trim().max(40).optional().or(z.literal("")), currentPassword: z.string().optional(), newPassword: z.string().min(8).max(200).optional().or(z.literal("")) });

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { id: true, name: true, documentNumber: true, email: true, phone: true, role: true } });
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revisa los datos del perfil." }, { status: 400 });
  const current = await prisma.user.findUnique({ where: { id: session.id } });
  if (!current) return NextResponse.json({ error: "La cuenta no existe." }, { status: 404 });
  if (parsed.data.newPassword) { if (!parsed.data.currentPassword || !(await compare(parsed.data.currentPassword, current.passwordHash))) return NextResponse.json({ error: "La contraseña actual no coincide." }, { status: 400 }); }
  try {
    const user = await prisma.user.update({ where: { id: session.id }, data: { name: parsed.data.name, email: parsed.data.email.toLowerCase(), phone: parsed.data.phone || null, ...(parsed.data.newPassword ? { passwordHash: await hash(parsed.data.newPassword, 12) } : {}) }, select: { id: true, name: true, documentNumber: true, email: true, phone: true, role: true } });
    await prisma.auditLog.create({ data: { userId: session.id, entity: "User", entityId: session.id, action: parsed.data.newPassword ? "PROFILE_AND_PASSWORD_UPDATED" : "PROFILE_UPDATED", newData: { name: user.name, email: user.email, phone: user.phone } } });
    const token = await createSessionToken({ id: user.id, name: user.name, email: user.email, role: user.role });
    const response = NextResponse.json({ user });
    response.cookies.set(sessionCookie(token));
    return response;
  } catch (error) { if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Ese correo ya está registrado." }, { status: 409 }); return NextResponse.json({ error: "No fue posible actualizar tu cuenta." }, { status: 500 }); }
}
