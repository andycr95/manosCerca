import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, sessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({ documentNumber: z.string().trim().regex(/^\d{5,20}$/, "El documento debe contener entre 5 y 20 dígitos."), password: z.string().min(8).max(200) });

export async function POST(request: Request) {
  const body = loginSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "Ingresa un número de documento y contraseña válidos." }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { documentNumber: body.data.documentNumber } });
  if (!user?.active || !(await compare(body.data.password, user.passwordHash))) return NextResponse.json({ error: "Documento o contraseña incorrectos." }, { status: 401 });
  const token = await createSessionToken({ id: user.id, name: user.name, email: user.email, role: user.role });
  const response = NextResponse.json({ user: { name: user.name, role: user.role } });
  response.cookies.set(sessionCookie(token));
  return response;
}
