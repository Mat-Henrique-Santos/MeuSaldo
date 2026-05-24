import { Router } from "express";
import PDFDocument from "pdfkit";
import type { Transaction } from "@prisma/client";
import { auth, type AuthRequest } from "../auth.js";
import { prisma } from "../prisma.js";

export const reportRoutes = Router();
reportRoutes.use(auth);

async function getRows(userId: string, month?: string) {
  const where: { userId: string; date?: { gte: Date; lt: Date } } = { userId };
  if (month) {
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    where.date = { gte: start, lt: end };
  }
  return prisma.transaction.findMany({ where, orderBy: { date: "desc" } });
}

const categoryLabel: Record<string, string> = {
  FOOD: "Alimentação",
  TRANSPORT: "Transporte",
  FUN: "Lazer",
  BILLS: "Contas",
  SALARY: "Salário",
  SHOPPING: "Compras"
};

const typeLabel: Record<string, string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa"
};

function formatMoney(value: number | string) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatMonth(month?: string) {
  if (!month) return "Todos os períodos";
  const date = new Date(`${month}-01T00:00:00.000Z`);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
}

function summarize(rows: Transaction[]) {
  const income = rows.filter((row) => row.type === "INCOME").reduce((sum, row) => sum + Number(row.amount), 0);
  const expense = rows.filter((row) => row.type === "EXPENSE").reduce((sum, row) => sum + Number(row.amount), 0);
  return { income, expense, balance: income - expense };
}

reportRoutes.get("/csv", async (req: AuthRequest, res) => {
  const month = String(req.query.month ?? "");
  const rows = await getRows(req.userId!, month);
  const summary = summarize(rows);
  const cell = (value: unknown) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
  const lines = [
    ["MeuSaldo - Relatório financeiro"].map(cell).join(","),
    ["Período", formatMonth(month)].map(cell).join(","),
    ["Gerado em", new Date().toLocaleString("pt-BR")].map(cell).join(","),
    [],
    ["Resumo"].map(cell).join(","),
    ["Receitas", formatMoney(summary.income)].map(cell).join(","),
    ["Despesas", formatMoney(summary.expense)].map(cell).join(","),
    ["Saldo", formatMoney(summary.balance)].map(cell).join(","),
    [],
    ["Data", "Tipo", "Categoria", "Valor", "Descrição"].map(cell).join(","),
    ...rows.map((r) => [
      formatDate(r.date),
      typeLabel[r.type],
      categoryLabel[r.category],
      formatMoney(String(r.amount)),
      r.description
    ].map(cell).join(","))
  ];
  res.header("Content-Type", "text/csv; charset=utf-8");
  res.attachment(`meusaldo-${month || "relatorio"}.csv`);
  res.send(`\uFEFF${lines.join("\n")}`);
});

reportRoutes.get("/pdf", async (req: AuthRequest, res) => {
  const month = String(req.query.month ?? "");
  const rows = await getRows(req.userId!, month);
  const summary = summarize(rows);
  const doc = new PDFDocument({ margin: 44, size: "A4", bufferPages: true });
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;

  res.header("Content-Type", "application/pdf");
  res.attachment(`meusaldo-${month || "relatorio"}.pdf`);
  doc.pipe(res);

  doc.rect(0, 0, pageWidth, 108).fill("#111827");
  doc.fillColor("#ffffff").fontSize(24).text("MeuSaldo", 44, 34);
  doc.fillColor("#d1d5db").fontSize(11).text("Relatório financeiro pessoal", 44, 66);
  doc.fillColor("#d1d5db").fontSize(10).text(`Período: ${formatMonth(month)}`, pageWidth - 244, 42, { width: 200, align: "right" });
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, pageWidth - 244, 60, { width: 200, align: "right" });

  const cardY = 132;
  const gap = 12;
  const cardWidth = (contentWidth - gap * 2) / 3;
  const cards = [
    { title: "Receitas", value: formatMoney(summary.income), color: "#047857" },
    { title: "Despesas", value: formatMoney(summary.expense), color: "#dc2626" },
    { title: "Saldo", value: formatMoney(summary.balance), color: summary.balance >= 0 ? "#047857" : "#dc2626" }
  ];

  cards.forEach((card, index) => {
    const x = 44 + index * (cardWidth + gap);
    doc.roundedRect(x, cardY, cardWidth, 68, 6).fill("#f9fafb").stroke("#e5e7eb");
    doc.fillColor("#6b7280").fontSize(9).text(card.title.toUpperCase(), x + 14, cardY + 14);
    doc.fillColor(card.color).fontSize(17).text(card.value, x + 14, cardY + 34, { width: cardWidth - 28 });
  });

  let y = 236;
  doc.fillColor("#111827").fontSize(15).text("Lançamentos", 44, y);
  y += 28;

  const columns = [
    { title: "Data", x: 44, width: 72 },
    { title: "Tipo", x: 116, width: 76 },
    { title: "Categoria", x: 192, width: 96 },
    { title: "Descrição", x: 288, width: 154 },
    { title: "Valor", x: 442, width: 110 }
  ];

  function drawTableHeader() {
    doc.rect(44, y, contentWidth, 24).fill("#e5e7eb");
    doc.fillColor("#374151").fontSize(9);
    columns.forEach((column) => doc.text(column.title, column.x + 6, y + 8, { width: column.width - 12 }));
    y += 24;
  }

  function newPageIfNeeded(rowHeight = 28) {
    if (y + rowHeight > doc.page.height - 64) {
      doc.addPage();
      y = 54;
      drawTableHeader();
    }
  }

  drawTableHeader();

  if (rows.length === 0) {
    doc.fillColor("#6b7280").fontSize(10).text("Nenhum lançamento encontrado para este período.", 50, y + 12);
  }

  rows.forEach((r, index) => {
    newPageIfNeeded();
    const isIncome = r.type === "INCOME";
    doc.rect(44, y, contentWidth, 28).fill(index % 2 === 0 ? "#ffffff" : "#f9fafb");
    doc.fillColor("#111827").fontSize(9).text(formatDate(r.date), 50, y + 9, { width: 60 });
    doc.text(typeLabel[r.type], 122, y + 9, { width: 64 });
    doc.text(categoryLabel[r.category], 198, y + 9, { width: 84 });
    doc.fillColor("#4b5563").text(r.description ?? "-", 294, y + 9, { width: 142, ellipsis: true });
    doc.fillColor(isIncome ? "#047857" : "#dc2626").text(formatMoney(String(r.amount)), 448, y + 9, { width: 98, align: "right" });
    y += 28;
  });

  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i += 1) {
    doc.switchToPage(i);
    doc.fillColor("#9ca3af").fontSize(8).text(`MeuSaldo • Página ${i + 1} de ${totalPages}`, 44, doc.page.height - 36, {
      width: contentWidth,
      align: "center"
    });
  }

  doc.end();
});
