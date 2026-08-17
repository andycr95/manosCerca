import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "turahelp_session";
const sessionDuration = "12h";

export type Session = { id: string; name: string; email: string; role: Role };

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET debe tener al menos 32 caracteres.");
  return new TextEncoder().encode(value);
}

export async function createSessionToken(user: Session) {
  return new SignJWT({ name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(sessionDuration)
    .sign(secret());
}

export async function verifySessionToken(token?: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.name !== "string" || typeof payload.email !== "string" || !isRole(payload.role)) return null;
    return { id: payload.sub, name: payload.name, email: payload.email, role: payload.role };
  } catch { return null; }
}

export async function getSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export function isRole(value: unknown): value is Role {
  return value === "SUPERADMIN" || value === "ADMIN" || value === "LEADER" || value === "COLLABORATOR";
}

export function canManageUsers(role: Role) { return role === "SUPERADMIN" || role === "ADMIN"; }
export function canManageRequests(role: Role) { return role === "SUPERADMIN" || role === "ADMIN" || role === "LEADER"; }
export function canRegisterDelivery(role: Role) { return isRole(role); }

export function sessionCookie(token: string) {
  return { name: SESSION_COOKIE, value: token, httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 };
}
