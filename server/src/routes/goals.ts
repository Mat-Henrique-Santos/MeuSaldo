import { Router } from "express";
import { z } from "zod";
import { auth, type AuthRequest } from "../auth.js";
import { prisma } from "../prisma.js";

export const goalRoutes = Router();
goalRoutes.use(auth);

const schema = z.object({
  title: z.string().min(2),
  target: z.coerce.number().positive(),
  saved: z.coerce.number().min(0).default(0),
  deadline: z.coerce.date().optional()
});

goalRoutes.get("/", async (req: AuthRequest, res) => {
  res.json(await prisma.goal.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: "desc" } }));
});

goalRoutes.post("/", async (req: AuthRequest, res) => {
  const data = schema.parse(req.body);
  res.status(201).json(await prisma.goal.create({ data: { ...data, userId: req.userId! } }));
});

goalRoutes.patch("/:id", async (req: AuthRequest, res) => {
  const data = schema.partial().parse(req.body);
  const id = String(req.params.id);
  await prisma.goal.updateMany({ where: { id, userId: req.userId! }, data });
  res.json(await prisma.goal.findFirst({ where: { id, userId: req.userId! } }));
});

goalRoutes.delete("/:id", async (req: AuthRequest, res) => {
  await prisma.goal.deleteMany({ where: { id: String(req.params.id), userId: req.userId! } });
  res.status(204).end();
});
