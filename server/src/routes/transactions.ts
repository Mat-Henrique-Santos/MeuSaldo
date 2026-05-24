import { Router } from "express";
import { z } from "zod";
import { auth, type AuthRequest } from "../auth.js";
import { prisma } from "../prisma.js";

export const transactionRoutes = Router();
transactionRoutes.use(auth);

const schema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.enum(["FOOD", "TRANSPORT", "FUN", "BILLS", "SALARY", "SHOPPING"]),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  date: z.coerce.date()
});

function monthRange(month?: string) {
  if (!month) return {};
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { date: { gte: start, lt: end } };
}

transactionRoutes.get("/", async (req: AuthRequest, res) => {
  const rows = await prisma.transaction.findMany({
    where: { userId: req.userId!, ...monthRange(String(req.query.month ?? "")) },
    orderBy: { date: "desc" }
  });
  res.json(rows);
});

transactionRoutes.post("/", async (req: AuthRequest, res) => {
  const data = schema.parse(req.body);
  const row = await prisma.transaction.create({ data: { ...data, userId: req.userId! } });
  res.status(201).json(row);
});

transactionRoutes.delete("/:id", async (req: AuthRequest, res) => {
  await prisma.transaction.deleteMany({ where: { id: String(req.params.id), userId: req.userId! } });
  res.status(204).end();
});

transactionRoutes.get("/summary/monthly", async (req: AuthRequest, res) => {
  const rows = await prisma.transaction.findMany({
    where: { userId: req.userId!, ...monthRange(String(req.query.month ?? "")) }
  });

  const income = rows.filter((r) => r.type === "INCOME").reduce((sum, r) => sum + Number(r.amount), 0);
  const expense = rows.filter((r) => r.type === "EXPENSE").reduce((sum, r) => sum + Number(r.amount), 0);
  const byCategory = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.category] = (acc[row.category] ?? 0) + Number(row.amount);
    return acc;
  }, {});

  res.json({ income, expense, balance: income - expense, byCategory });
});
