import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";
import { canManageUsers, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  documentNumber: z.string().trim().regex(/^\d{5,20}$/, "El documento debe contener entre 5 y 20 dígitos."),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  password: z.string().min(8).max(200).optional().or(z.literal("")),
  role: z.nativeEnum(Role),
  active: z.boolean(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!canManageUsers(session.role)) return NextResponse.json({ error: "No tienes permiso para administrar usuarios." }, { status: 403 });
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revisa los datos del usuario." }, { status: 400 });
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "La persona no existe." }, { status: 404 });
  if (current.id === session.id && !parsed.data.active) return NextResponse.json({ error: "No puedes desactivar tu propia cuenta." }, { status: 400 });
  if (session.role !== "SUPERADMIN" && (new Set<Role>([Role.SUPERADMIN, Role.ADMIN]).has(current.role) || new Set<Role>([Role.SUPERADMIN, Role.ADMIN]).has(parsed.data.role))) return NextResponse.json({ error: "No tienes permiso para modificar cuentas administrativas." }, { status: 403 });
  try {
    const user = await prisma.user.update({ where: { id }, data: { name: parsed.data.name, documentNumber: parsed.data.documentNumber, email: parsed.data.email.toLowerCase(), phone: parsed.data.phone || null, role: parsed.data.role, active: parsed.data.active, ...(parsed.data.password ? { passwordHash: await hash(parsed.data.password, 12) } : {}) }, select: { id: true, name: true, documentNumber: true, email: true, phone: true, role: true, active: true, createdAt: true, updatedAt: true } });
    await prisma.auditLog.create({ data: { userId: session.id, entity: "User", entityId: user.id, action: "USER_UPDATED", oldData: { name: current.name, documentNumber: current.documentNumber, email: current.email, role: current.role, active: current.active }, newData: { name: user.name, documentNumber: user.documentNumber, email: user.email, role: user.role, active: user.active } } });
    return NextResponse.json({ user });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "El documento o correo ya está registrado." }, { status: 409 });
    return NextResponse.json({ error: "No fue posible actualizar la persona." }, { status: 500 });
  }
}
