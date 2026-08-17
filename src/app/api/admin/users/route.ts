import { NextResponse } from "next/server";
import { canManageUsers, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!canManageUsers(session.role)) return NextResponse.json({ error: "No tienes permiso para administrar usuarios." }, { status: 403 });
  const users = await prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, documentNumber: true, email: true, role: true, active: true }, orderBy: { name: "asc" } });
  return NextResponse.json({ users });
}
