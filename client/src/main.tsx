import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Check, Download, Edit2, LogOut, Moon, Plus, Sun, Trash2, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import "./styles.css";

const API = import.meta.env.VITE_API_URL ?? `${window.location.protocol}//${window.location.hostname}:3333`;
const categories = ["FOOD", "TRANSPORT", "FUN", "BILLS", "SALARY", "SHOPPING"] as const;
const labels: Record<string, string> = {
  FOOD: "Alimentação",
  TRANSPORT: "Transporte",
  FUN: "Lazer",
  BILLS: "Contas",
  SALARY: "Salário",
  SHOPPING: "Compras",
  INCOME: "Receita",
  EXPENSE: "Despesa"
};

type Transaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: string;
  description?: string;
  date: string;
};

type Goal = { id: string; title: string; target: string; saved: string };
type Summary = { income: number; expense: number; balance: number; byCategory: Record<string, number> };
type Theme = "light" | "dark";

function money(value: number | string) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function useApi(token: string) {
  return async function request<T>(path: string, options: RequestInit = {}) {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? "Erro");
    return res.status === 204 ? (null as T) : ((await res.json()) as T);
  };
}

function Auth({ onToken }: { onToken: (token: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API}/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      localStorage.setItem("token", data.token);
      onToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    }
  }

  return (
    <main className="auth">
      <form onSubmit={submit} className="panel">
        <h1>MeuSaldo</h1>
        <div className="tabs">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Entrar</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Cadastrar</button>
        </div>
        {mode === "register" && <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Senha" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="error">{error}</p>}
        <button className="primary">{mode === "login" ? "Entrar" : "Criar conta"}</button>
      </form>
    </main>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") ?? "");
  const api = useApi(token);
  const [theme, setTheme] = useState<Theme>((localStorage.getItem("theme") as Theme) || "light");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<Summary>({ income: 0, expense: 0, balance: 0, byCategory: {} });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [tx, setTx] = useState({ type: "EXPENSE", category: "FOOD", amount: "", description: "", date: new Date().toISOString().slice(0, 10) });
  const [goal, setGoal] = useState({ title: "", target: "", saved: "" });
  const [goalDraft, setGoalDraft] = useState({ title: "", target: "", saved: "" });

  const chartData = useMemo(
    () => Object.entries(summary.byCategory).map(([category, value]) => ({ category: labels[category], value })),
    [summary]
  );

  async function load() {
    if (!token) return;
    const [list, sum, goalList] = await Promise.all([
      api<Transaction[]>(`/transactions?month=${month}`),
      api<Summary>(`/transactions/summary/monthly?month=${month}`),
      api<Goal[]>("/goals")
    ]);
    setTransactions(list);
    setSummary(sum);
    setGoals(goalList);
  }

  useEffect(() => {
    load().catch(() => {
      localStorage.removeItem("token");
      setToken("");
    });
  }, [token, month]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  async function addTransaction(e: React.FormEvent) {
    e.preventDefault();
    await api("/transactions", { method: "POST", body: JSON.stringify(tx) });
    setTx({ ...tx, amount: "", description: "" });
    await load();
  }

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    await api("/goals", { method: "POST", body: JSON.stringify(goal) });
    setGoal({ title: "", target: "", saved: "" });
    await load();
  }

  function editGoal(g: Goal) {
    setEditingGoalId(g.id);
    setGoalDraft({ title: g.title, target: String(g.target), saved: String(g.saved) });
  }

  async function saveGoal(id: string) {
    await api(`/goals/${id}`, { method: "PATCH", body: JSON.stringify(goalDraft) });
    setEditingGoalId(null);
    await load();
  }

  async function deleteGoal(id: string) {
    await api(`/goals/${id}`, { method: "DELETE" });
    await load();
  }

  function logout() {
    localStorage.removeItem("token");
    setToken("");
  }

  async function downloadReport(format: "csv" | "pdf") {
    const res = await fetch(`${API}/reports/${format}?month=${month}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Falha ao exportar");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meusaldo-${month}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!token) return <Auth onToken={setToken} />;

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">Controle financeiro</p>
          <h1>MeuSaldo</h1>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <button className="icon" onClick={() => downloadReport("csv")}><Download size={18} /> CSV</button>
        <button className="icon" onClick={() => downloadReport("pdf")}><Download size={18} /> PDF</button>
        <button className="icon square" onClick={() => setTheme(theme === "light" ? "dark" : "light")} title="Alternar tema">
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button className="icon" onClick={logout}><LogOut size={18} /></button>
      </header>

      <section className="stats">
        <article><span>Receitas</span><strong className="ok">{money(summary.income)}</strong></article>
        <article><span>Despesas</span><strong className="bad">{money(summary.expense)}</strong></article>
        <article><span>Saldo</span><strong className={summary.balance >= 0 ? "ok" : "bad"}>{money(summary.balance)}</strong></article>
      </section>

      <section className="grid">
        <form className="panel" onSubmit={addTransaction}>
          <div className="panel-title">
            <h2>Novo lançamento</h2>
            <span>Receita ou despesa</span>
          </div>
          <div className="row">
            <select value={tx.type} onChange={(e) => setTx({ ...tx, type: e.target.value })}>
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
            </select>
            <select value={tx.category} onChange={(e) => setTx({ ...tx, category: e.target.value })}>
              {categories.map((c) => <option key={c} value={c}>{labels[c]}</option>)}
            </select>
          </div>
          <input required type="number" step="0.01" placeholder="Valor" value={tx.amount} onChange={(e) => setTx({ ...tx, amount: e.target.value })} />
          <input type="date" value={tx.date} onChange={(e) => setTx({ ...tx, date: e.target.value })} />
          <input placeholder="Descrição" value={tx.description} onChange={(e) => setTx({ ...tx, description: e.target.value })} />
          <button className="primary"><Plus size={18} /> Adicionar</button>
        </form>

        <div className="panel chart">
          <div className="panel-title">
            <h2>Por categoria</h2>
            <span>Resumo do mês</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid">
        <div className="panel">
          <div className="panel-title">
            <h2>Lançamentos</h2>
            <span>{transactions.length} registro(s)</span>
          </div>
          <div className="list">
            {transactions.map((item) => (
              <div className="item" key={item.id}>
                <div>
                  <span>{labels[item.category]}</span>
                  <small>{item.description || "Sem descrição"} · {new Date(item.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</small>
                </div>
                <strong className={item.type === "INCOME" ? "ok" : "bad"}>{money(item.amount)}</strong>
                <button className="ghost" onClick={async () => { await api(`/transactions/${item.id}`, { method: "DELETE" }); await load(); }}><Trash2 size={16} /></button>
              </div>
            ))}
            {transactions.length === 0 && <p className="empty">Nenhum lançamento neste mês.</p>}
          </div>
        </div>

        <form className="panel" onSubmit={addGoal}>
          <div className="panel-title">
            <h2>Metas</h2>
            <span>Planejamento</span>
          </div>
          <div className="row">
            <input required placeholder="Meta" value={goal.title} onChange={(e) => setGoal({ ...goal, title: e.target.value })} />
            <input required type="number" step="0.01" placeholder="Alvo" value={goal.target} onChange={(e) => setGoal({ ...goal, target: e.target.value })} />
          </div>
          <input type="number" step="0.01" placeholder="Guardado" value={goal.saved} onChange={(e) => setGoal({ ...goal, saved: e.target.value })} />
          <button className="primary"><Plus size={18} /> Criar meta</button>
          <div className="list">
            {goals.map((g) => {
              const pct = Math.min(100, (Number(g.saved) / Number(g.target)) * 100);
              const editing = editingGoalId === g.id;
              return (
                <div className="goal" key={g.id}>
                  {editing ? (
                    <>
                      <input required value={goalDraft.title} onChange={(e) => setGoalDraft({ ...goalDraft, title: e.target.value })} />
                      <div className="row">
                        <input required type="number" step="0.01" value={goalDraft.target} onChange={(e) => setGoalDraft({ ...goalDraft, target: e.target.value })} />
                        <input type="number" step="0.01" value={goalDraft.saved} onChange={(e) => setGoalDraft({ ...goalDraft, saved: e.target.value })} />
                      </div>
                      <div className="actions">
                        <button type="button" className="primary compact" onClick={() => saveGoal(g.id)}><Check size={16} /> Salvar</button>
                        <button type="button" className="icon compact" onClick={() => setEditingGoalId(null)}><X size={16} /> Cancelar</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="goal-head">
                        <div>
                          <span>{g.title}</span>
                          <strong>{money(g.saved)} / {money(g.target)}</strong>
                        </div>
                        <div className="actions">
                          <button type="button" className="ghost" onClick={() => editGoal(g)} title="Editar meta"><Edit2 size={16} /></button>
                          <button type="button" className="ghost" onClick={() => deleteGoal(g.id)} title="Excluir meta"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <div className="progress"><i style={{ width: `${pct}%` }} /></div>
                      <small>{pct.toFixed(0)}% concluído</small>
                    </>
                  )}
                </div>
              );
            })}
            {goals.length === 0 && <p className="empty">Nenhuma meta criada.</p>}
          </div>
        </form>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
