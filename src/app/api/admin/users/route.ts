import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";
import { canManageUsers, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const userSchema = z.object({
  name: z.string().trim().min(2).max(120),
  documentNumber: z.string().trim().regex(/^\d{5,20}$/, "El documento debe contener entre 5 y 20 dígitos."),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  password: z.string().min(8).max(200),
  role: z.nativeEnum(Role),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!canManageUsers(session.role)) return NextResponse.json({ error: "No tienes permiso para administrar usuarios." }, { status: 403 });
  const users = await prisma.user.findMany({ select: { id: true, name: true, documentNumber: true, email: true, phone: true, role: true, active: true, createdAt: true, updatedAt: true }, orderBy: { name: "asc" } });
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!canManageUsers(session.role)) return NextResponse.json({ error: "No tienes permiso para administrar usuarios." }, { status: 403 });
  const parsed = userSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revisa los datos del usuario." }, { status: 400 });
  if (session.role !== "SUPERADMIN" && new Set<Role>([Role.SUPERADMIN, Role.ADMIN]).has(parsed.data.role)) return NextResponse.json({ error: "Solo un superadministrador puede crear cuentas administrativas." }, { status: 403 });
  try {
    const user = await prisma.user.create({ data: { name: parsed.data.name, documentNumber: parsed.data.documentNumber, email: parsed.data.email.toLowerCase(), phone: parsed.data.phone || null, passwordHash: await hash(parsed.data.password, 12), role: parsed.data.role }, select: { id: true, name: true, documentNumber: true, email: true, phone: true, role: true, active: true, createdAt: true, updatedAt: true } });
    await prisma.auditLog.create({ data: { userId: session.id, entity: "User", entityId: user.id, action: "USER_CREATED", newData: { name: user.name, documentNumber: user.documentNumber, email: user.email, role: user.role } } });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "El documento o correo ya está registrado." }, { status: 409 });
    return NextResponse.json({ error: "No fue posible crear la persona." }, { status: 500 });
  }
}
