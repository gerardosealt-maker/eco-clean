"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Cloud,
  CloudOff,
  CreditCard,
  Download,
  FileText,
  Gauge,
  Home,
  LayoutDashboard,
  ListChecks,
  Lock,
  LogOut,
  Menu,
  PiggyBank,
  Plus,
  ReceiptText,
  RefreshCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Target,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createDemoData, createEmptyData } from "../lib/demo-data";
import {
  buildAlerts,
  computedDebtStatus,
  debtBalance,
  exportMovementsCSV,
  getDailyChart,
  getExpenseCategoryChart,
  getMonthlyTrend,
  getMonthMovements,
  getSummary,
  money,
  monthKey,
  paidProgress,
  parseNumber,
  percent,
  todayISO,
} from "../lib/finance";
import { downloadText, loadLocalData, makeId, normalizeData, saveLocalData } from "../lib/storage";
import type { AppData, Category, Debt, Movement, MovementType, Tag } from "../lib/types";

type View = "dashboard" | "capture" | "movements" | "debts" | "reports" | "settings";

type SyncMode = "checking" | "local" | "cloud";

type MovementForm = {
  id?: string;
  date: string;
  type: MovementType;
  category: string;
  concept: string;
  amount: string;
  paymentMethod: string;
  debtId?: string;
  tags: string[];
  note: string;
};

type DebtForm = {
  id?: string;
  creditor: string;
  concept: string;
  originalAmount: string;
  paidAmount: string;
  startDate: string;
  dueDate: string;
  note: string;
};

const movementTypes: { type: MovementType; label: string; helper: string; icon: React.ReactNode }[] = [
  { type: "Venta", label: "Venta", helper: "Dinero que entra por venta", icon: <ArrowUpRight size={19} /> },
  { type: "Ingreso extra", label: "Ingreso extra", helper: "Ingreso fuera de venta normal", icon: <PiggyBank size={19} /> },
  { type: "Compra", label: "Compra", helper: "Mercancía o surtido", icon: <ReceiptText size={19} /> },
  { type: "Gasto", label: "Gasto", helper: "Servicios, sueldos u operación", icon: <ArrowDownRight size={19} /> },
  { type: "Pago de deuda", label: "Pago de deuda", helper: "Abono a una deuda", icon: <CreditCard size={19} /> },
];

const chartColors = ["#06b6d4", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#0ea5e9", "#64748b", "#f97316"];

function defaultCategory(type: MovementType) {
  if (type === "Venta") return "Ventas";
  if (type === "Ingreso extra") return "Ingreso extra";
  if (type === "Compra") return "Compras";
  if (type === "Pago de deuda") return "Deudas";
  return "Otros";
}

function defaultConcept(type: MovementType) {
  if (type === "Venta") return "Venta diaria";
  if (type === "Ingreso extra") return "Ingreso extra";
  if (type === "Compra") return "Compra de mercancía";
  if (type === "Pago de deuda") return "Pago de deuda";
  return "Gasto del negocio";
}

function freshMovementForm(type: MovementType = "Venta"): MovementForm {
  return {
    date: todayISO(),
    type,
    category: defaultCategory(type),
    concept: defaultConcept(type),
    amount: "",
    paymentMethod: "Efectivo",
    tags: [],
    note: "",
  };
}

function freshDebtForm(): DebtForm {
  return {
    creditor: "",
    concept: "",
    originalAmount: "",
    paidAmount: "0",
    startDate: todayISO(),
    dueDate: todayISO(),
    note: "",
  };
}

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function FinanceApp() {
  const [data, setData] = useState<AppData>(() => createDemoData());
  const [view, setView] = useState<View>("dashboard");
  const [selectedMonth, setSelectedMonth] = useState(monthKey());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [syncMode, setSyncMode] = useState<SyncMode>("checking");
  const [syncMessage, setSyncMessage] = useState("Cargando información...");
  const [authenticated, setAuthenticated] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [movementForm, setMovementForm] = useState<MovementForm>(freshMovementForm());
  const [debtForm, setDebtForm] = useState<DebtForm>(freshDebtForm());
  const [movementQuery, setMovementQuery] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState<"Todos" | MovementType>("Todos");
  const [paymentDebtId, setPaymentDebtId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [categoryForm, setCategoryForm] = useState<Category>({ id: "", name: "", kind: "Egreso", color: "#06b6d4", icon: "📌", active: true });
  const [tagForm, setTagForm] = useState<Tag>({ id: "", name: "", color: "#06b6d4", icon: "🏷️", active: true });
  const [newPaymentMethod, setNewPaymentMethod] = useState("");

  useEffect(() => {
    async function boot() {
      const session = await fetch("/api/auth", { cache: "no-store" }).then((response) => response.json()).catch(() => ({ authenticated: true, required: false }));
      setAuthRequired(Boolean(session.required));
      setAuthenticated(Boolean(session.authenticated));
      if (!session.authenticated) {
        setSyncMode("local");
        setSyncMessage("Inicia sesión para abrir el tablero.");
        return;
      }
      await loadData();
    }
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    const localData = loadLocalData();
    setData(localData);
    setSyncMode("local");
    setSyncMessage("Modo local activo. Tus datos se guardan en este navegador.");

    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (response.status === 401) {
        setAuthenticated(false);
        return;
      }
      const result = await response.json();
      if (result.mode === "cloud") {
        if (result.data) {
          setData(result.data);
          saveLocalData(result.data);
        } else {
          await saveCloud(localData);
        }
        setSyncMode("cloud");
        setSyncMessage("Sincronizado en la nube con Supabase.");
      }
    } catch {
      setSyncMode("local");
      setSyncMessage("Modo local activo. Puedes conectar Supabase cuando quieras sincronización multi-dispositivo.");
    }
  }

  async function saveCloud(nextData: AppData) {
    const response = await fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: nextData }),
    });
    if (!response.ok) throw new Error("No se pudo guardar en nube");
  }

  async function persist(nextData: AppData, message = "Cambios guardados.") {
    const stamped = normalizeData({ ...nextData, updatedAt: new Date().toISOString() });
    setData(stamped);
    saveLocalData(stamped);
    if (syncMode === "cloud") {
      try {
        await saveCloud(stamped);
        setSyncMessage("Cambios guardados en la nube.");
      } catch {
        setSyncMode("local");
        setSyncMessage("No se pudo guardar en nube. Se conservó respaldo local.");
      }
    } else {
      setSyncMessage(message);
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setLoginError("Contraseña incorrecta. Intenta de nuevo.");
      return;
    }
    setAuthenticated(true);
    setPassword("");
    await loadData();
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    setAuthenticated(false);
  }

  const summary = useMemo(() => getSummary(data, selectedMonth), [data, selectedMonth]);
  const dailyChart = useMemo(() => getDailyChart(data, selectedMonth), [data, selectedMonth]);
  const categoryChart = useMemo(() => getExpenseCategoryChart(data, selectedMonth), [data, selectedMonth]);
  const trendChart = useMemo(() => getMonthlyTrend(data), [data]);
  const alerts = useMemo(() => buildAlerts(data, selectedMonth), [data, selectedMonth]);
  const monthMovements = useMemo(() => getMonthMovements(data, selectedMonth), [data, selectedMonth]);

  const filteredMovements = useMemo(() => {
    return data.movements
      .filter((movement) => isMonthOrAll(movement.date, selectedMonth))
      .filter((movement) => movementTypeFilter === "Todos" || movement.type === movementTypeFilter)
      .filter((movement) => {
        if (!movementQuery.trim()) return true;
        const q = movementQuery.toLowerCase();
        return [movement.concept, movement.category, movement.type, movement.paymentMethod, movement.note, ...(movement.tags || [])].some((value) => value?.toLowerCase().includes(q));
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [data.movements, selectedMonth, movementTypeFilter, movementQuery]);

  function isMonthOrAll(date: string, key: string) {
    return date.startsWith(key);
  }

  function setMovementType(type: MovementType) {
    setMovementForm((current) => ({
      ...current,
      type,
      category: defaultCategory(type),
      concept: current.id ? current.concept : defaultConcept(type),
      debtId: type === "Pago de deuda" ? current.debtId || data.debts[0]?.id : undefined,
    }));
  }

  async function submitMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = parseNumber(movementForm.amount);
    if (!amount || amount <= 0) {
      setSyncMessage("Captura un monto mayor a cero.");
      return;
    }

    const now = new Date().toISOString();
    const movement: Movement = {
      id: movementForm.id || makeId("mov"),
      date: movementForm.date,
      type: movementForm.type,
      category: movementForm.category,
      concept: movementForm.concept || defaultConcept(movementForm.type),
      amount,
      paymentMethod: movementForm.paymentMethod,
      tags: movementForm.tags || [],
      debtId: movementForm.type === "Pago de deuda" ? movementForm.debtId : undefined,
      note: movementForm.note,
      createdAt: movementForm.id ? data.movements.find((item) => item.id === movementForm.id)?.createdAt || now : now,
      updatedAt: now,
    };

    let nextMovements = movementForm.id ? data.movements.map((item) => (item.id === movement.id ? movement : item)) : [movement, ...data.movements];
    let nextDebts = data.debts;

    if (movement.type === "Pago de deuda" && movement.debtId && !movementForm.id) {
      nextDebts = data.debts.map((debt) =>
        debt.id === movement.debtId
          ? { ...debt, paidAmount: Math.min(debt.originalAmount, debt.paidAmount + amount), updatedAt: now }
          : debt
      );
    }

    await persist({ ...data, movements: nextMovements, debts: nextDebts }, "Movimiento guardado.");
    setMovementForm(freshMovementForm(movement.type));
    setView("dashboard");
  }

  function editMovement(movement: Movement) {
    setMovementForm({
      id: movement.id,
      date: movement.date,
      type: movement.type,
      category: movement.category,
      concept: movement.concept,
      amount: String(movement.amount),
      paymentMethod: movement.paymentMethod,
      tags: movement.tags || [],
      debtId: movement.debtId,
      note: movement.note || "",
    });
    setView("capture");
  }

  async function deleteMovement(movement: Movement) {
    const shouldDelete = window.confirm("¿Eliminar este movimiento?");
    if (!shouldDelete) return;
    const nextMovements = data.movements.filter((item) => item.id !== movement.id);
    const nextDebts = movement.type === "Pago de deuda" && movement.debtId
      ? data.debts.map((debt) => debt.id === movement.debtId ? { ...debt, paidAmount: Math.max(0, debt.paidAmount - movement.amount) } : debt)
      : data.debts;
    await persist({ ...data, movements: nextMovements, debts: nextDebts }, "Movimiento eliminado.");
  }

  async function submitDebt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const originalAmount = parseNumber(debtForm.originalAmount);
    if (!debtForm.creditor.trim() || !originalAmount) {
      setSyncMessage("Captura acreedor y monto original de la deuda.");
      return;
    }
    const now = new Date().toISOString();
    const debt: Debt = {
      id: debtForm.id || makeId("debt"),
      creditor: debtForm.creditor,
      concept: debtForm.concept || "Deuda del negocio",
      originalAmount,
      paidAmount: Math.min(originalAmount, parseNumber(debtForm.paidAmount)),
      startDate: debtForm.startDate,
      dueDate: debtForm.dueDate,
      status: "En proceso",
      note: debtForm.note,
      createdAt: debtForm.id ? data.debts.find((item) => item.id === debtForm.id)?.createdAt || now : now,
      updatedAt: now,
    };
    const debts = debtForm.id ? data.debts.map((item) => (item.id === debt.id ? debt : item)) : [debt, ...data.debts];
    await persist({ ...data, debts }, "Deuda guardada.");
    setDebtForm(freshDebtForm());
  }

  function editDebt(debt: Debt) {
    setDebtForm({
      id: debt.id,
      creditor: debt.creditor,
      concept: debt.concept,
      originalAmount: String(debt.originalAmount),
      paidAmount: String(debt.paidAmount),
      startDate: debt.startDate,
      dueDate: debt.dueDate,
      note: debt.note || "",
    });
    setView("debts");
  }

  async function deleteDebt(debtId: string) {
    if (!window.confirm("¿Eliminar esta deuda?")) return;
    await persist({ ...data, debts: data.debts.filter((debt) => debt.id !== debtId) }, "Deuda eliminada.");
  }

  async function registerDebtPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const debt = data.debts.find((item) => item.id === paymentDebtId);
    const amount = parseNumber(paymentAmount);
    if (!debt || amount <= 0) {
      setSyncMessage("Selecciona una deuda y un monto válido.");
      return;
    }
    const now = new Date().toISOString();
    const payment: Movement = {
      id: makeId("mov"),
      date: todayISO(),
      type: "Pago de deuda",
      category: "Deudas",
      concept: `Pago a ${debt.creditor}`,
      amount,
      paymentMethod: "Transferencia",
      debtId: debt.id,
      note: debt.concept,
      createdAt: now,
    };
    const debts = data.debts.map((item) => item.id === debt.id ? { ...item, paidAmount: Math.min(item.originalAmount, item.paidAmount + amount), updatedAt: now } : item);
    await persist({ ...data, movements: [payment, ...data.movements], debts }, "Pago de deuda registrado.");
    setPaymentAmount("");
    setPaymentDebtId("");
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await persist(data, "Configuración guardada.");
  }

  function updateSettings<K extends keyof AppData["settings"]>(key: K, value: AppData["settings"][K]) {
    setData((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  }

  async function saveCurrentData() {
    await persist(data, "Configuración guardada.");
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryForm.name.trim();
    if (!name) {
      setSyncMessage("Escribe el nombre de la categoría.");
      return;
    }
    const category: Category = {
      ...categoryForm,
      id: categoryForm.id || makeId("cat"),
      name,
      icon: categoryForm.icon || "📌",
      color: categoryForm.color || "#06b6d4",
      active: true,
    };
    const categories = categoryForm.id ? data.categories.map((item) => item.id === category.id ? category : item) : [...data.categories, category];
    await persist({ ...data, categories }, "Categoría guardada.");
    setCategoryForm({ id: "", name: "", kind: "Egreso", color: "#06b6d4", icon: "📌", active: true });
  }

  function editCategory(category: Category) {
    setCategoryForm(category);
  }

  async function deleteCategory(category: Category) {
    const inUse = data.movements.some((movement) => movement.category === category.name);
    const message = inUse ? "Esta categoría ya tiene movimientos. Se desactivará para no romper reportes. ¿Continuar?" : "¿Eliminar esta categoría?";
    if (!window.confirm(message)) return;
    const categories = inUse ? data.categories.map((item) => item.id === category.id ? { ...item, active: false } : item) : data.categories.filter((item) => item.id !== category.id);
    await persist({ ...data, categories }, inUse ? "Categoría desactivada." : "Categoría eliminada.");
  }

  async function submitTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = tagForm.name.trim();
    if (!name) {
      setSyncMessage("Escribe el nombre de la etiqueta.");
      return;
    }
    const tag: Tag = {
      ...tagForm,
      id: tagForm.id || makeId("tag"),
      name,
      icon: tagForm.icon || "🏷️",
      color: tagForm.color || "#06b6d4",
      active: true,
    };
    const tags = tagForm.id ? data.tags.map((item) => item.id === tag.id ? tag : item) : [...data.tags, tag];
    await persist({ ...data, tags }, "Etiqueta guardada.");
    setTagForm({ id: "", name: "", color: "#06b6d4", icon: "🏷️", active: true });
  }

  function editTag(tag: Tag) {
    setTagForm(tag);
  }

  async function deleteTag(tag: Tag) {
    const inUse = data.movements.some((movement) => movement.tags?.includes(tag.name));
    const message = inUse ? "Esta etiqueta ya está en movimientos. Se desactivará para conservar el histórico. ¿Continuar?" : "¿Eliminar esta etiqueta?";
    if (!window.confirm(message)) return;
    const tags = inUse ? data.tags.map((item) => item.id === tag.id ? { ...item, active: false } : item) : data.tags.filter((item) => item.id !== tag.id);
    await persist({ ...data, tags }, inUse ? "Etiqueta desactivada." : "Etiqueta eliminada.");
  }

  async function addPaymentMethod() {
    const method = newPaymentMethod.trim();
    if (!method || data.settings.paymentMethods.includes(method)) return;
    await persist({ ...data, settings: { ...data.settings, paymentMethods: [...data.settings.paymentMethods, method] } }, "Método de pago agregado.");
    setNewPaymentMethod("");
  }

  async function deletePaymentMethod(method: string) {
    if (data.settings.paymentMethods.length <= 1) return;
    if (!window.confirm(`¿Quitar el método ${method}?`)) return;
    await persist({ ...data, settings: { ...data.settings, paymentMethods: data.settings.paymentMethods.filter((item) => item !== method) } }, "Método de pago eliminado.");
  }

  async function resetDemo() {
    if (!window.confirm("Esto reemplazará la información actual por datos demo. ¿Continuar?")) return;
    await persist(createDemoData(), "Datos demo restaurados.");
  }

  async function resetEmpty() {
    if (!window.confirm("Esto dejará la app en blanco. Descarga un respaldo antes si lo necesitas. ¿Continuar?")) return;
    await persist(createEmptyData(), "App reiniciada en blanco.");
  }

  function exportBackup() {
    downloadText(`control-financiero-${todayISO()}.json`, JSON.stringify(data, null, 2));
  }

  function importBackup(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const imported = JSON.parse(String(reader.result)) as AppData;
        if (!Array.isArray(imported.movements)) throw new Error("Archivo inválido");
        await persist(imported, "Respaldo importado.");
      } catch {
        setSyncMessage("No se pudo importar el respaldo. Revisa el archivo.");
      }
    };
    reader.readAsText(file);
  }

  function exportCSV() {
    downloadText(`movimientos-${selectedMonth}.csv`, exportMovementsCSV(filteredMovements), "text/csv;charset=utf-8");
  }

  if (!authenticated && authRequired) {
    return <LoginScreen password={password} setPassword={setPassword} login={login} error={loginError} />;
  }

  return (
    <div className="app-shell">
      <aside className={cn("sidebar", mobileNavOpen && "open")}> 
        <div className="brand-block">
          <div className="brand-icon"><WalletCards size={24} /></div>
          <div>
            <strong>{data.settings.businessName}</strong>
            <span>{data.settings.ownerName}</span>
          </div>
        </div>
        <nav className="nav-list">
          <NavButton icon={<LayoutDashboard size={19} />} label="Dashboard" active={view === "dashboard"} onClick={() => setViewAndClose("dashboard")} />
          <NavButton icon={<Plus size={19} />} label="Nueva captura" active={view === "capture"} onClick={() => setViewAndClose("capture")} />
          <NavButton icon={<ListChecks size={19} />} label="Movimientos" active={view === "movements"} onClick={() => setViewAndClose("movements")} />
          <NavButton icon={<CreditCard size={19} />} label="Deudas" active={view === "debts"} onClick={() => setViewAndClose("debts")} />
          <NavButton icon={<FileText size={19} />} label="Reportes" active={view === "reports"} onClick={() => setViewAndClose("reports")} />
          <NavButton icon={<Settings size={19} />} label="Configuración" active={view === "settings"} onClick={() => setViewAndClose("settings")} />
        </nav>
        <div className="side-footer">
          <div className={cn("sync-pill", syncMode === "cloud" ? "cloud" : "local")}>{syncMode === "cloud" ? <Cloud size={15} /> : <CloudOff size={15} />} {syncMode === "cloud" ? "Nube" : "Local"}</div>
          <small>{syncMessage}</small>
          {authRequired && <button className="ghost-button" onClick={logout}><LogOut size={16} /> Salir</button>}
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNavOpen(true)}><Menu size={22} /></button>
          <div>
            <p className="eyebrow">Resumen operativo</p>
            <h1>{pageTitle(view)}</h1>
          </div>
          <div className="topbar-actions">
            <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
            <button className="secondary-button" onClick={() => setView("capture")}><Plus size={17} /> Capturar</button>
          </div>
        </header>

        {mobileNavOpen && <button className="nav-backdrop" aria-label="Cerrar menú" onClick={() => setMobileNavOpen(false)} />}

        {view === "dashboard" && <DashboardView data={data} summary={summary} dailyChart={dailyChart} categoryChart={categoryChart} trendChart={trendChart} alerts={alerts} selectedMonth={selectedMonth} setView={setView} />}
        {view === "capture" && (
          <CaptureView
            data={data}
            form={movementForm}
            setForm={setMovementForm}
            setType={setMovementType}
            submit={submitMovement}
            cancelEdit={() => setMovementForm(freshMovementForm())}
          />
        )}
        {view === "movements" && (
          <MovementsView
            movements={filteredMovements}
            query={movementQuery}
            setQuery={setMovementQuery}
            typeFilter={movementTypeFilter}
            setTypeFilter={setMovementTypeFilter}
            editMovement={editMovement}
            deleteMovement={deleteMovement}
            exportCSV={exportCSV}
          />
        )}
        {view === "debts" && (
          <DebtsView
            data={data}
            debtForm={debtForm}
            setDebtForm={setDebtForm}
            submitDebt={submitDebt}
            editDebt={editDebt}
            deleteDebt={deleteDebt}
            paymentDebtId={paymentDebtId}
            setPaymentDebtId={setPaymentDebtId}
            paymentAmount={paymentAmount}
            setPaymentAmount={setPaymentAmount}
            registerPayment={registerDebtPayment}
          />
        )}
        {view === "reports" && <ReportsView data={data} selectedMonth={selectedMonth} summary={summary} monthMovements={monthMovements} categoryChart={categoryChart} dailyChart={dailyChart} exportCSV={exportCSV} />}
        {view === "settings" && (
          <SettingsView
            data={data}
            updateSettings={updateSettings}
            saveSettings={saveSettings}
            saveCurrentData={saveCurrentData}
            exportBackup={exportBackup}
            importBackup={importBackup}
            resetDemo={resetDemo}
            resetEmpty={resetEmpty}
            syncMode={syncMode}
            categoryForm={categoryForm}
            setCategoryForm={setCategoryForm}
            tagForm={tagForm}
            setTagForm={setTagForm}
            submitCategory={submitCategory}
            editCategory={editCategory}
            deleteCategory={deleteCategory}
            submitTag={submitTag}
            editTag={editTag}
            deleteTag={deleteTag}
            newPaymentMethod={newPaymentMethod}
            setNewPaymentMethod={setNewPaymentMethod}
            addPaymentMethod={addPaymentMethod}
            deletePaymentMethod={deletePaymentMethod}
          />
        )}
      </main>
    </div>
  );

  function setViewAndClose(nextView: View) {
    setView(nextView);
    setMobileNavOpen(false);
  }
}

function LoginScreen({ password, setPassword, login, error }: { password: string; setPassword: (value: string) => void; login: (event: FormEvent<HTMLFormElement>) => void; error: string }) {
  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="login-icon"><ShieldCheck size={30} /></div>
        <p className="eyebrow">Acceso privado</p>
        <h1>Eco-Clean Financiero</h1>
        <p>Ingresa la contraseña para abrir el tablero del negocio.</p>
        <form onSubmit={login}>
          <label>Contraseña</label>
          <div className="password-field"><Lock size={17} /><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoFocus placeholder="••••••••" /></div>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button" type="submit">Entrar</button>
        </form>
      </section>
    </main>
  );
}

function pageTitle(view: View) {
  const titles: Record<View, string> = {
    dashboard: "Dashboard Eco-Clean",
    capture: "Nueva captura",
    movements: "Movimientos",
    debts: "Control de deudas",
    reports: "Reportes mensuales",
    settings: "Configuración",
  };
  return titles[view];
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button className={cn("nav-button", active && "active")} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function DashboardView({ data, summary, dailyChart, categoryChart, trendChart, alerts, selectedMonth, setView }: any) {
  return (
    <div className="view-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Hola, {data.settings.ownerName}</p>
          <h2>Este es el resumen de tu negocio.</h2>
          <p>{data.settings.businessType} · {data.settings.city}. Ventas, gastos, utilidad, deudas y avance de meta en una sola vista.</p>
        </div>
        <div className="hero-actions">
          <button className="primary-button" onClick={() => setView("capture")}><Plus size={18} /> Nueva captura</button>
          <button className="secondary-button" onClick={() => setView("reports")}><FileText size={18} /> Ver reporte</button>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard title="Ventas hoy" value={money(summary.salesToday)} icon={<CircleDollarSign />} tone="cyan" detail={`Meta diaria: ${money(data.settings.dailySalesGoal)}`} />
        <MetricCard title="Ventas del mes" value={money(summary.salesMonth)} icon={<ArrowUpRight />} tone="green" detail={`${percent(summary.goalProgress)} de la meta`} />
        <MetricCard title="Gastos + compras" value={money(summary.expensesMonth + summary.purchasesMonth)} icon={<ArrowDownRight />} tone="red" detail={`Límite: ${money(data.settings.maxMonthlyExpenses)}`} />
        <MetricCard title="Utilidad estimada" value={money(summary.estimatedProfit)} icon={<Gauge />} tone={summary.estimatedProfit >= 0 ? "green" : "red"} detail="Ingresos menos salidas" />
        <MetricCard title="Deuda pendiente" value={money(summary.pendingDebt)} icon={<CreditCard />} tone="purple" detail={`${summary.overdueDebts} vencida(s)`} />
        <MetricCard title="Mejor día" value={summary.bestSalesDay === "Sin ventas" ? "Sin ventas" : money(summary.bestSalesDayAmount)} icon={<CalendarClock />} tone="amber" detail={summary.bestSalesDay} />
      </section>

      <section className="dashboard-grid">
        <ChartCard title="Ventas y egresos por día" subtitle={`Mes ${selectedMonth}`} wide>
          <ResponsiveContainer width="100%" height={310}>
            <AreaChart data={dailyChart} margin={{ top: 10, right: 18, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.22}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient>
                <linearGradient id="outFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.18}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(value) => `$${Number(value) / 1000}k`} />
              <Tooltip formatter={(value: number) => money(value)} contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} />
              <Area type="monotone" dataKey="ventas" stroke="#06b6d4" strokeWidth={3} fill="url(#salesFill)" name="Ingresos" />
              <Area type="monotone" dataKey="egresos" stroke="#ef4444" strokeWidth={2} fill="url(#outFill)" name="Egresos" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Gastos por categoría" subtitle="Distribución de salidas">
          {categoryChart.length ? (
            <ResponsiveContainer width="100%" height={310}>
              <PieChart>
                <Pie data={categoryChart} dataKey="value" nameKey="name" innerRadius={70} outerRadius={108} paddingAngle={3}>
                  {categoryChart.map((_: any, index: number) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => money(value)} contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState text="Sin gastos este mes" />}
        </ChartCard>
      </section>

      <section className="dashboard-grid lower-grid">
        <ChartCard title="Tendencia mensual" subtitle="Últimos 6 meses" wide>
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={trendChart} margin={{ top: 8, right: 18, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(value) => `$${Number(value) / 1000}k`} />
              <Tooltip formatter={(value: number) => money(value)} contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} />
              <Bar dataKey="ingresos" name="Ingresos" fill="#22c55e" radius={[8, 8, 0, 0]} />
              <Bar dataKey="egresos" name="Egresos" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="stacked-cards">
          <ProgressCard title="Avance de meta mensual" value={summary.goalProgress} current={summary.salesMonth} target={data.settings.monthlySalesGoal} />
          <AlertsCard alerts={alerts} />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, value, detail, icon, tone }: { title: string; value: string; detail: string; icon: React.ReactNode; tone: string }) {
  return (
    <article className={cn("metric-card", tone)}>
      <div className="metric-icon">{icon}</div>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function ChartCard({ title, subtitle, children, wide }: { title: string; subtitle: string; children: React.ReactNode; wide?: boolean }) {
  return <article className={cn("chart-card", wide && "wide")}><div className="card-heading"><div><h3>{title}</h3><p>{subtitle}</p></div></div>{children}</article>;
}

function ProgressCard({ title, value, current, target }: { title: string; value: number; current: number; target: number }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <article className="chart-card compact-card">
      <div className="card-heading"><div><h3>{title}</h3><p>{money(current)} de {money(target)}</p></div><Target size={21} /></div>
      <div className="progress-track"><div className={cn("progress-fill", safeValue >= 80 ? "good" : safeValue >= 50 ? "warn" : "bad")} style={{ width: `${safeValue}%` }} /></div>
      <div className="progress-footer"><strong>{percent(value)}</strong><span>completado</span></div>
    </article>
  );
}

function AlertsCard({ alerts }: { alerts: { title: string; body: string; tone: string }[] }) {
  return (
    <article className="chart-card alerts-card">
      <div className="card-heading"><div><h3>Alertas inteligentes</h3><p>Lectura rápida del negocio</p></div><AlertTriangle size={21} /></div>
      <div className="alerts-list">
        {alerts.map((alert) => <div className={cn("alert-item", alert.tone)} key={alert.title}><strong>{alert.title}</strong><span>{alert.body}</span></div>)}
      </div>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function CaptureView({ data, form, setForm, setType, submit, cancelEdit }: { data: AppData; form: MovementForm; setForm: (value: MovementForm | ((current: MovementForm) => MovementForm)) => void; setType: (type: MovementType) => void; submit: (event: FormEvent<HTMLFormElement>) => void; cancelEdit: () => void }) {
  const categories = data.categories.filter((category) => category.active && (form.type === "Venta" || form.type === "Ingreso extra" ? category.kind === "Ingreso" : form.type === "Pago de deuda" ? category.kind === "Deuda" : category.kind === "Egreso"));
  const activeTags = data.tags.filter((tag) => tag.active);
  const toggleTag = (name: string) => {
    const currentTags = form.tags || [];
    setForm({ ...form, tags: currentTags.includes(name) ? currentTags.filter((tag) => tag !== name) : [...currentTags, name] });
  };
  return (
    <div className="view-stack">
      <section className="quick-type-grid">
        {movementTypes.map((item) => (
          <button key={item.type} className={cn("type-tile", form.type === item.type && "active")} onClick={() => setType(item.type)}>
            <span>{item.icon}</span><strong>{item.label}</strong><small>{item.helper}</small>
          </button>
        ))}
      </section>

      <section className="form-card">
        <div className="form-card-header"><div><p className="eyebrow">Captura rápida</p><h2>{form.id ? "Editar movimiento" : `Registrar ${form.type.toLowerCase()}`}</h2></div>{form.id && <button className="ghost-button dark" onClick={cancelEdit}><X size={16} /> Cancelar edición</button>}</div>
        <form className="smart-form" onSubmit={submit}>
          <div className="field"><label>Fecha</label><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></div>
          <div className="field"><label>Categoría</label><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.name}>{category.icon} {category.name}</option>)}</select></div>
          <div className="field wide-field"><label>Concepto</label><input value={form.concept} onChange={(event) => setForm({ ...form, concept: event.target.value })} placeholder="Ej. Venta diaria" required /></div>
          <div className="field"><label>Monto</label><input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} inputMode="decimal" placeholder="0.00" required /></div>
          <div className="field"><label>Método de pago</label><select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}>{data.settings.paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></div>
          {form.type === "Pago de deuda" && <div className="field wide-field"><label>Aplicar a deuda</label><select value={form.debtId || ""} onChange={(event) => setForm({ ...form, debtId: event.target.value })}><option value="">Solo registrar movimiento</option>{data.debts.map((debt) => <option value={debt.id} key={debt.id}>{debt.creditor} · saldo {money(debtBalance(debt))}</option>)}</select></div>}
          {activeTags.length > 0 && <div className="field wide-field"><label>Etiquetas opcionales</label><div className="tag-picker">{activeTags.map((tag) => <button type="button" key={tag.id} className={cn("tag-chip", form.tags?.includes(tag.name) && "selected")} style={{ borderColor: tag.color }} onClick={() => toggleTag(tag.name)}><span>{tag.icon}</span>{tag.name}</button>)}</div></div>}
          <div className="field wide-field"><label>Nota opcional</label><textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Algún detalle que quieras recordar" /></div>
          <div className="form-actions"><button className="primary-button" type="submit"><Save size={17} /> Guardar movimiento</button></div>
        </form>
      </section>
    </div>
  );
}

function MovementsView({ movements, query, setQuery, typeFilter, setTypeFilter, editMovement, deleteMovement, exportCSV }: { movements: Movement[]; query: string; setQuery: (value: string) => void; typeFilter: "Todos" | MovementType; setTypeFilter: (value: "Todos" | MovementType) => void; editMovement: (movement: Movement) => void; deleteMovement: (movement: Movement) => void; exportCSV: () => void }) {
  const totalIn = movements.filter((movement) => movement.type === "Venta" || movement.type === "Ingreso extra").reduce((total, movement) => total + movement.amount, 0);
  const totalOut = movements.filter((movement) => movement.type !== "Venta" && movement.type !== "Ingreso extra").reduce((total, movement) => total + movement.amount, 0);
  return (
    <div className="view-stack">
      <section className="toolbar-card">
        <div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por concepto, categoría o nota" /></div>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "Todos" | MovementType)}><option>Todos</option>{movementTypes.map((item) => <option key={item.type}>{item.type}</option>)}</select>
        <button className="secondary-button" onClick={exportCSV}><Download size={17} /> CSV</button>
      </section>
      <section className="mini-metrics">
        <div><span>Ingresos filtrados</span><strong>{money(totalIn)}</strong></div>
        <div><span>Salidas filtradas</span><strong>{money(totalOut)}</strong></div>
        <div><span>Flujo filtrado</span><strong>{money(totalIn - totalOut)}</strong></div>
      </section>
      <section className="table-card">
        <div className="table-scroll"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Concepto</th><th>Monto</th><th>Método</th><th>Etiquetas</th><th></th></tr></thead><tbody>{movements.map((movement) => <tr key={movement.id}><td>{movement.date}</td><td><span className={cn("type-badge", movement.type.includes("Venta") || movement.type.includes("Ingreso") ? "in" : "out")}>{movement.type}</span></td><td>{movement.category}</td><td><strong>{movement.concept}</strong><small>{movement.note}</small></td><td className="amount-cell">{money(movement.amount)}</td><td>{movement.paymentMethod}</td><td><div className="mini-tags">{(movement.tags || []).map((tag) => <span key={tag}>{tag}</span>)}</div></td><td className="row-actions"><button onClick={() => editMovement(movement)}>Editar</button><button className="danger-link" onClick={() => deleteMovement(movement)}><Trash2 size={15} /></button></td></tr>)}</tbody></table>{movements.length === 0 && <EmptyState text="Sin movimientos con estos filtros" />}</div>
      </section>
    </div>
  );
}

function DebtsView({ data, debtForm, setDebtForm, submitDebt, editDebt, deleteDebt, paymentDebtId, setPaymentDebtId, paymentAmount, setPaymentAmount, registerPayment }: { data: AppData; debtForm: DebtForm; setDebtForm: (value: DebtForm) => void; submitDebt: (event: FormEvent<HTMLFormElement>) => void; editDebt: (debt: Debt) => void; deleteDebt: (id: string) => void; paymentDebtId: string; setPaymentDebtId: (value: string) => void; paymentAmount: string; setPaymentAmount: (value: string) => void; registerPayment: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className="view-stack">
      <section className="debt-grid">
        {data.debts.map((debt) => {
          const balance = debtBalance(debt);
          const progress = paidProgress(debt);
          const status = computedDebtStatus(debt);
          return <article className="debt-card" key={debt.id}><div className="debt-header"><div><span className={cn("status-dot", status.toLowerCase().replace(" ", "-"))}>{status}</span><h3>{debt.creditor}</h3><p>{debt.concept}</p></div><CreditCard size={22} /></div><div className="debt-money"><div><span>Saldo</span><strong>{money(balance)}</strong></div><div><span>Original</span><strong>{money(debt.originalAmount)}</strong></div></div><div className="progress-track slim"><div className="progress-fill good" style={{ width: `${progress}%` }} /></div><div className="debt-footer"><span>{percent(progress)} pagado</span><span>Vence {debt.dueDate}</span></div><div className="debt-actions"><button onClick={() => editDebt(debt)}>Editar</button><button className="danger-link" onClick={() => deleteDebt(debt.id)}>Eliminar</button></div></article>;
        })}
      </section>

      <section className="dashboard-grid">
        <article className="form-card">
          <div className="form-card-header"><div><p className="eyebrow">Alta y edición</p><h2>{debtForm.id ? "Editar deuda" : "Nueva deuda"}</h2></div></div>
          <form className="smart-form" onSubmit={submitDebt}>
            <div className="field"><label>Acreedor</label><input value={debtForm.creditor} onChange={(e) => setDebtForm({ ...debtForm, creditor: e.target.value })} placeholder="Ej. Caja Popular" required /></div>
            <div className="field"><label>Concepto</label><input value={debtForm.concept} onChange={(e) => setDebtForm({ ...debtForm, concept: e.target.value })} placeholder="Crédito / proveedor" /></div>
            <div className="field"><label>Monto original</label><input value={debtForm.originalAmount} onChange={(e) => setDebtForm({ ...debtForm, originalAmount: e.target.value })} inputMode="decimal" required /></div>
            <div className="field"><label>Pagado</label><input value={debtForm.paidAmount} onChange={(e) => setDebtForm({ ...debtForm, paidAmount: e.target.value })} inputMode="decimal" /></div>
            <div className="field"><label>Fecha inicio</label><input type="date" value={debtForm.startDate} onChange={(e) => setDebtForm({ ...debtForm, startDate: e.target.value })} /></div>
            <div className="field"><label>Fecha límite</label><input type="date" value={debtForm.dueDate} onChange={(e) => setDebtForm({ ...debtForm, dueDate: e.target.value })} /></div>
            <div className="field wide-field"><label>Nota</label><textarea value={debtForm.note} onChange={(e) => setDebtForm({ ...debtForm, note: e.target.value })} /></div>
            <div className="form-actions"><button className="primary-button" type="submit"><Save size={17} /> Guardar deuda</button></div>
          </form>
        </article>

        <article className="form-card">
          <div className="form-card-header"><div><p className="eyebrow">Abonos</p><h2>Registrar pago de deuda</h2></div></div>
          <form className="smart-form one-column" onSubmit={registerPayment}>
            <div className="field"><label>Deuda</label><select value={paymentDebtId} onChange={(e) => setPaymentDebtId(e.target.value)}><option value="">Selecciona una deuda</option>{data.debts.filter((debt) => debtBalance(debt) > 0).map((debt) => <option value={debt.id} key={debt.id}>{debt.creditor} · saldo {money(debtBalance(debt))}</option>)}</select></div>
            <div className="field"><label>Monto del pago</label><input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} inputMode="decimal" placeholder="0.00" /></div>
            <button className="primary-button" type="submit"><CheckCircle2 size={17} /> Registrar pago</button>
          </form>
        </article>
      </section>
    </div>
  );
}

function ReportsView({ data, selectedMonth, summary, monthMovements, categoryChart, dailyChart, exportCSV }: { data: AppData; selectedMonth: string; summary: any; monthMovements: Movement[]; categoryChart: any[]; dailyChart: any[]; exportCSV: () => void }) {
  return (
    <div className="view-stack report-view">
      <section className="hero-card print-hero"><div><p className="eyebrow">Reporte mensual · {selectedMonth}</p><h2>{data.settings.businessName}</h2><p>Resumen de ingresos, salidas, utilidad y deudas.</p></div><div className="hero-actions no-print"><button className="secondary-button" onClick={() => window.print()}><FileText size={17} /> Imprimir / PDF</button><button className="secondary-button" onClick={exportCSV}><Download size={17} /> CSV</button></div></section>
      <section className="metrics-grid four"><MetricCard title="Ingresos" value={money(summary.salesMonth + summary.extraIncomeMonth)} icon={<ArrowUpRight />} tone="green" detail="Ventas + extras" /><MetricCard title="Salidas" value={money(summary.outflowsMonth)} icon={<ArrowDownRight />} tone="red" detail="Gastos + compras + deuda" /><MetricCard title="Utilidad" value={money(summary.estimatedProfit)} icon={<Gauge />} tone={summary.estimatedProfit >= 0 ? "green" : "red"} detail="Estimada" /><MetricCard title="Deuda pendiente" value={money(summary.pendingDebt)} icon={<CreditCard />} tone="purple" detail="Saldo activo" /></section>
      <section className="dashboard-grid"><ChartCard title="Comportamiento diario" subtitle="Ingresos y salidas"><ResponsiveContainer width="100%" height={300}><BarChart data={dailyChart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis tickFormatter={(value) => `$${Number(value) / 1000}k`} tickLine={false} axisLine={false} /><Tooltip formatter={(value: number) => money(value)} /><Bar dataKey="ventas" fill="#22c55e" radius={[8, 8, 0, 0]} /><Bar dataKey="egresos" fill="#ef4444" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard><ChartCard title="Top categorías" subtitle="Dónde se fue el dinero"><div className="category-list">{categoryChart.map((item, index) => <div key={item.name}><span><i style={{ background: chartColors[index % chartColors.length] }} />{item.name}</span><strong>{money(item.value)}</strong></div>)}</div></ChartCard></section>
      <section className="table-card"><div className="card-heading"><div><h3>Detalle del mes</h3><p>{monthMovements.length} movimientos registrados</p></div></div><div className="table-scroll"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Monto</th></tr></thead><tbody>{monthMovements.sort((a, b) => b.date.localeCompare(a.date)).map((m) => <tr key={m.id}><td>{m.date}</td><td>{m.type}</td><td>{m.concept}</td><td className="amount-cell">{money(m.amount)}</td></tr>)}</tbody></table></div></section>
    </div>
  );
}

function SettingsView({
  data,
  updateSettings,
  saveSettings,
  saveCurrentData,
  exportBackup,
  importBackup,
  resetDemo,
  resetEmpty,
  syncMode,
  categoryForm,
  setCategoryForm,
  tagForm,
  setTagForm,
  submitCategory,
  editCategory,
  deleteCategory,
  submitTag,
  editTag,
  deleteTag,
  newPaymentMethod,
  setNewPaymentMethod,
  addPaymentMethod,
  deletePaymentMethod,
}: {
  data: AppData;
  updateSettings: <K extends keyof AppData["settings"]>(key: K, value: AppData["settings"][K]) => void;
  saveSettings: (event: FormEvent<HTMLFormElement>) => void;
  saveCurrentData: () => void;
  exportBackup: () => void;
  importBackup: (file: File | null) => void;
  resetDemo: () => void;
  resetEmpty: () => void;
  syncMode: SyncMode;
  categoryForm: Category;
  setCategoryForm: (value: Category) => void;
  tagForm: Tag;
  setTagForm: (value: Tag) => void;
  submitCategory: (event: FormEvent<HTMLFormElement>) => void;
  editCategory: (category: Category) => void;
  deleteCategory: (category: Category) => void;
  submitTag: (event: FormEvent<HTMLFormElement>) => void;
  editTag: (tag: Tag) => void;
  deleteTag: (tag: Tag) => void;
  newPaymentMethod: string;
  setNewPaymentMethod: (value: string) => void;
  addPaymentMethod: () => void;
  deletePaymentMethod: (method: string) => void;
}) {
  return (
    <div className="view-stack">
      <section className="form-card">
        <div className="form-card-header">
          <div>
            <p className="eyebrow">Parámetros del negocio</p>
            <h2>Metas y datos generales</h2>
          </div>
          <div className={cn("sync-pill", syncMode === "cloud" ? "cloud" : "local")}>{syncMode === "cloud" ? <Cloud size={15} /> : <CloudOff size={15} />} {syncMode === "cloud" ? "Modo nube" : "Modo local"}</div>
        </div>
        <form className="smart-form" onSubmit={saveSettings}>
          <div className="field"><label>Nombre del negocio</label><input value={data.settings.businessName} onChange={(e) => updateSettings("businessName", e.target.value)} /></div>
          <div className="field"><label>Nombre visible</label><input value={data.settings.ownerName} onChange={(e) => updateSettings("ownerName", e.target.value)} /></div>
          <div className="field"><label>Ciudad</label><input value={data.settings.city} onChange={(e) => updateSettings("city", e.target.value)} /></div>
          <div className="field"><label>Giro del negocio</label><input value={data.settings.businessType} onChange={(e) => updateSettings("businessType", e.target.value)} /></div>
          <div className="field"><label>Meta mensual de ventas</label><input value={data.settings.monthlySalesGoal} onChange={(e) => updateSettings("monthlySalesGoal", parseNumber(e.target.value))} inputMode="decimal" /></div>
          <div className="field"><label>Meta diaria de ventas</label><input value={data.settings.dailySalesGoal} onChange={(e) => updateSettings("dailySalesGoal", parseNumber(e.target.value))} inputMode="decimal" /></div>
          <div className="field"><label>Máximo de gastos mensual</label><input value={data.settings.maxMonthlyExpenses} onChange={(e) => updateSettings("maxMonthlyExpenses", parseNumber(e.target.value))} inputMode="decimal" /></div>
          <div className="form-actions"><button className="primary-button" type="submit"><Save size={17} /> Guardar configuración</button><button className="secondary-button" type="button" onClick={saveCurrentData}>Sincronizar ahora</button></div>
        </form>
      </section>

      <section className="dashboard-grid settings-grid">
        <article className="form-card">
          <div className="form-card-header"><div><p className="eyebrow">Personalización</p><h2>Categorías</h2></div></div>
          <form className="smart-form compact-form" onSubmit={submitCategory}>
            <div className="field"><label>Nombre</label><input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="Ej. Publicidad" /></div>
            <div className="field"><label>Tipo</label><select value={categoryForm.kind} onChange={(e) => setCategoryForm({ ...categoryForm, kind: e.target.value as Category["kind"] })}><option>Ingreso</option><option>Egreso</option><option>Deuda</option></select></div>
            <div className="field"><label>Ícono / emoji</label><input value={categoryForm.icon} onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })} placeholder="🧴" /></div>
            <div className="field"><label>Color</label><input type="color" value={categoryForm.color} onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })} /></div>
            <div className="form-actions"><button className="primary-button" type="submit"><Save size={17} /> {categoryForm.id ? "Actualizar" : "Agregar"} categoría</button>{categoryForm.id && <button className="secondary-button" type="button" onClick={() => setCategoryForm({ id: "", name: "", kind: "Egreso", color: "#06b6d4", icon: "📌", active: true })}>Nueva</button>}</div>
          </form>
          <div className="category-list editable-list">
            {data.categories.map((category) => <div key={category.id} className={!category.active ? "disabled-item" : ""}><span><em style={{ background: category.color }}>{category.icon}</em>{category.name}<small>{category.kind}{!category.active ? " · inactiva" : ""}</small></span><strong><button onClick={() => editCategory(category)}>Editar</button><button className="danger-link" onClick={() => deleteCategory(category)}>Quitar</button></strong></div>)}
          </div>
        </article>

        <article className="form-card">
          <div className="form-card-header"><div><p className="eyebrow">Segmentación</p><h2>Etiquetas</h2></div></div>
          <form className="smart-form compact-form" onSubmit={submitTag}>
            <div className="field"><label>Nombre</label><input value={tagForm.name} onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })} placeholder="Ej. Mayoreo" /></div>
            <div className="field"><label>Ícono / emoji</label><input value={tagForm.icon} onChange={(e) => setTagForm({ ...tagForm, icon: e.target.value })} placeholder="🏷️" /></div>
            <div className="field"><label>Color</label><input type="color" value={tagForm.color} onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })} /></div>
            <div className="form-actions"><button className="primary-button" type="submit"><Save size={17} /> {tagForm.id ? "Actualizar" : "Agregar"} etiqueta</button>{tagForm.id && <button className="secondary-button" type="button" onClick={() => setTagForm({ id: "", name: "", color: "#06b6d4", icon: "🏷️", active: true })}>Nueva</button>}</div>
          </form>
          <div className="category-list editable-list">
            {data.tags.map((tag) => <div key={tag.id} className={!tag.active ? "disabled-item" : ""}><span><em style={{ background: tag.color }}>{tag.icon}</em>{tag.name}<small>{!tag.active ? "inactiva" : "activa"}</small></span><strong><button onClick={() => editTag(tag)}>Editar</button><button className="danger-link" onClick={() => deleteTag(tag)}>Quitar</button></strong></div>)}
          </div>
        </article>
      </section>

      <section className="dashboard-grid settings-grid">
        <article className="form-card">
          <div className="form-card-header"><div><p className="eyebrow">Cobranza</p><h2>Métodos de pago</h2></div></div>
          <div className="payment-methods">
            {data.settings.paymentMethods.map((method) => <span key={method}>{method}<button onClick={() => deletePaymentMethod(method)} aria-label={`Quitar ${method}`}>×</button></span>)}
          </div>
          <div className="inline-add"><input value={newPaymentMethod} onChange={(e) => setNewPaymentMethod(e.target.value)} placeholder="Nuevo método, ej. Mercado Pago" /><button className="secondary-button" onClick={addPaymentMethod}>Agregar</button></div>
        </article>

        <article className="form-card">
          <div className="form-card-header"><div><p className="eyebrow">Respaldo</p><h2>Exportar / importar datos</h2></div></div>
          <div className="settings-actions"><button className="secondary-button" onClick={exportBackup}><Download size={17} /> Descargar respaldo JSON</button><label className="upload-button"><input type="file" accept="application/json" onChange={(e) => importBackup(e.target.files?.[0] || null)} /> Importar respaldo</label></div>
        </article>
      </section>

      <section className="form-card danger-zone">
        <div className="form-card-header"><div><p className="eyebrow">Zona de reinicio</p><h2>Datos de prueba o app en blanco</h2></div></div>
        <div className="settings-actions"><button className="secondary-button" onClick={resetDemo}><RefreshCcw size={17} /> Restaurar demo</button><button className="danger-button" onClick={resetEmpty}><Trash2 size={17} /> Dejar en blanco</button></div>
      </section>
    </div>
  );
}
