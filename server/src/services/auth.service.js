import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { ApiError } from "../utils/ApiError.js";

const SALT_ROUNDS = 10;

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function register({ email, password, name, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict("Email already registered");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      // Self-signup can only ever create a LEARNER. Elevated roles are granted
      // by an admin or the seed script, never by request input.
      role: role === "INSTRUCTOR" ? "LEARNER" : "LEARNER",
    },
  });
  const token = signToken({ sub: user.id, role: user.role });
  return { user: publicUser(user), token };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized("Invalid credentials");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized("Invalid credentials");

  const token = signToken({ sub: user.id, role: user.role });
  return { user: publicUser(user), token };
}
