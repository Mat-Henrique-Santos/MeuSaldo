import "dotenv/config";
import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { authRoutes } from "./routes/auth.js";
import { goalRoutes } from "./routes/goals.js";
import { reportRoutes } from "./routes/reports.js";
import { transactionRoutes } from "./routes/transactions.js";

const app = express();
const port = Number(process.env.PORT ?? 3333);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRoutes);
app.use("/transactions", transactionRoutes);
app.use("/goals", goalRoutes);
app.use("/reports", reportRoutes);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({ message: "Dados inválidos", issues: error.issues });
    return;
  }
  res.status(500).json({ message: "Erro interno" });
});

app.listen(port, () => {
  console.log(`API em http://localhost:${port}`);
});
