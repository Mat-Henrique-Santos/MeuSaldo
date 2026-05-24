import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { signToken } from "../auth.js";

export const authRoutes = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

const loginSchema = registerSchema.omit({ name: true });

authRoutes.post("/register", async (req, res) => {
  const data = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 10);

  try {
    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, passwordHash },
      select: { id: true, name: true, email: true }
    });
    res.status(201).json({ user, token: signToken(user.id) });
  } catch {
    res.status(409).json({ message: "Email já cadastrado" });
  }
});

authRoutes.post("/login", async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
    res.status(401).json({ message: "Credenciais inválidas" });
    return;
  }

  res.json({
    user: { id: user.id, name: user.name, email: user.email },
    token: signToken(user.id)
  });
});
