import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "./prisma.server.js";

const SESSION_COOKIE = "lmb_portal_session";
const SESSION_HOURS = 24;

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createPortalSession(userId) {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * SESSION_HOURS);

  await prisma.portalSession.create({
    data: {
      userId,
      sessionToken,
      expiresAt,
    },
  });

  return { sessionToken, expiresAt };
}

export function createSessionCookie(sessionToken, expiresAt) {
  return [
    `${SESSION_COOKIE}=${sessionToken}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Secure",
    `Expires=${expiresAt.toUTCString()}`,
  ].join("; ");
}

export function destroySessionCookie() {
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Secure",
    "Max-Age=0",
  ].join("; ");
}

export async function getUserFromRequest(request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .filter(Boolean)
      .map((part) => {
        const [key, ...rest] = part.trim().split("=");
        return [key, rest.join("=")];
      })
  );

  const sessionToken = cookies[SESSION_COOKIE];
  if (!sessionToken) return null;

  const session = await prisma.portalSession.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session) return null;

  if (new Date(session.expiresAt) < new Date()) {
    await prisma.portalSession.delete({ where: { sessionToken } }).catch(() => {});
    return null;
  }

  if (!session.user.isActive) return null;

  return session.user;
}

export async function destroySessionFromRequest(request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .filter(Boolean)
      .map((part) => {
        const [key, ...rest] = part.trim().split("=");
        return [key, rest.join("=")];
      })
  );

  const sessionToken = cookies[SESSION_COOKIE];

  if (sessionToken) {
    await prisma.portalSession.delete({ where: { sessionToken } }).catch(() => {});
  }

  return destroySessionCookie();
}