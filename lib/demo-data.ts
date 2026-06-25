import type { AppData, Category, Debt, Movement, Settings, Tag } from "./types";
import { monthKey, todayISO } from "./finance";

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function isoDay(offset: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

const now = () => new Date().toISOString();

export const defaultSettings: Settings = {
  businessName: "Eco-Clean",
  ownerName: "Juan José",
  city: "Jalpan, Querétaro",
  businessType: "Venta de productos de limpieza",
  currency: "MXN",
  monthlySalesGoal: 85000,
  dailySalesGoal: 3200,
  maxMonthlyExpenses: 32000,
  lowGoalThreshold: 50,
  midGoalThreshold: 80,
  paymentMethods: ["Efectivo", "Transferencia", "Tarjeta", "Mixto", "Crédito", "Otro"],
};

export const defaultCategories: Category[] = [
  { id: "cat_ventas", name: "Ventas", kind: "Ingreso", color: "#06b6d4", icon: "🧾", active: true },
  { id: "cat_ingreso_extra", name: "Ingreso extra", kind: "Ingreso", color: "#22c55e", icon: "💰", active: true },
  { id: "cat_compras", name: "Compras", kind: "Egreso", color: "#14b8a6", icon: "📦", active: true },
  { id: "cat_insumos", name: "Insumos", kind: "Egreso", color: "#ef4444", icon: "🧴", active: true },
  { id: "cat_sueldos", name: "Sueldos", kind: "Egreso", color: "#0ea5e9", icon: "👥", active: true },
  { id: "cat_renta", name: "Renta", kind: "Egreso", color: "#8b5cf6", icon: "🏪", active: true },
  { id: "cat_luz", name: "Luz", kind: "Egreso", color: "#f59e0b", icon: "💡", active: true },
  { id: "cat_agua", name: "Agua", kind: "Egreso", color: "#38bdf8", icon: "💧", active: true },
  { id: "cat_transporte", name: "Transporte", kind: "Egreso", color: "#d97706", icon: "🚚", active: true },
  { id: "cat_mantenimiento", name: "Mantenimiento", kind: "Egreso", color: "#64748b", icon: "🛠️", active: true },
  { id: "cat_deudas", name: "Deudas", kind: "Deuda", color: "#a855f7", icon: "💳", active: true },
  { id: "cat_otros", name: "Otros", kind: "Egreso", color: "#94a3b8", icon: "📌", active: true },
];

export const defaultTags: Tag[] = [
  { id: "tag_mostrador", name: "Mostrador", color: "#06b6d4", icon: "🏪", active: true },
  { id: "tag_mayoreo", name: "Mayoreo", color: "#22c55e", icon: "📦", active: true },
  { id: "tag_proveedor", name: "Proveedor", color: "#f59e0b", icon: "🚚", active: true },
  { id: "tag_urgente", name: "Urgente", color: "#ef4444", icon: "⚠️", active: true },
];

function movement(date: string, type: Movement["type"], category: string, concept: string, amount: number, paymentMethod = "Efectivo", note = "", tags: string[] = []): Movement {
  return {
    id: id("mov"),
    date,
    type,
    category,
    concept,
    amount,
    paymentMethod,
    tags,
    note,
    createdAt: now(),
  };
}

export function createDemoData(): AppData {
  const currentMonth = monthKey();
  const sales = [2450, 3380, 1720, 2680, 2940, 0, 2180, 2360, 3920, 1960, 2510, 3280, 0, 2250, 2640, 4100, 2050, 2720, 3520, 0, 2380, 2890];
  const movements: Movement[] = sales.flatMap((amount, index) => {
    const date = `${currentMonth}-${String(index + 1).padStart(2, "0")}`;
    if (amount === 0) return [];
    const tags = index % 5 === 0 ? ["Mayoreo"] : ["Mostrador"];
    return [movement(date, "Venta", "Ventas", "Venta diaria", amount, index % 3 === 0 ? "Mixto" : "Efectivo", "", tags)];
  });

  movements.push(
    movement(`${currentMonth}-03`, "Compra", "Compras", "Surtido de cloro, pino y suavizante", 5200, "Transferencia", "Proveedor principal", ["Proveedor"]),
    movement(`${currentMonth}-05`, "Gasto", "Luz", "Pago de luz", 890, "Transferencia"),
    movement(`${currentMonth}-06`, "Gasto", "Transporte", "Flete proveedor", 650, "Efectivo", "", ["Proveedor"]),
    movement(`${currentMonth}-09`, "Compra", "Insumos", "Envases y atomizadores", 1650, "Efectivo"),
    movement(`${currentMonth}-11`, "Gasto", "Sueldos", "Apoyo semanal", 2400, "Efectivo"),
    movement(`${currentMonth}-13`, "Ingreso extra", "Ingreso extra", "Venta especial por mayoreo", 2800, "Transferencia", "", ["Mayoreo"]),
    movement(`${currentMonth}-15`, "Pago de deuda", "Deudas", "Pago Caja Popular", 2500, "Transferencia", "Pago parcial"),
    movement(`${currentMonth}-18`, "Gasto", "Mantenimiento", "Reparación menor", 780, "Efectivo"),
    movement(`${currentMonth}-20`, "Compra", "Compras", "Compra proveedor", 4950, "Transferencia", "", ["Proveedor"])
  );

  const debts: Debt[] = [
    {
      id: "debt_caja_popular",
      creditor: "Caja Popular",
      concept: "Crédito de negocio",
      originalAmount: 28000,
      paidAmount: 13000,
      startDate: isoDay(-90),
      dueDate: isoDay(5),
      status: "En proceso",
      note: "Pago sugerido cada semana.",
      createdAt: now(),
    },
    {
      id: "debt_proveedor",
      creditor: "Proveedor principal",
      concept: "Mercancía pendiente",
      originalAmount: 12500,
      paidAmount: 5500,
      startDate: isoDay(-30),
      dueDate: isoDay(12),
      status: "En proceso",
      note: "Liquidar antes de nuevo surtido.",
      createdAt: now(),
    },
  ];

  return {
    version: 3,
    settings: defaultSettings,
    movements,
    debts,
    categories: defaultCategories,
    tags: defaultTags,
    updatedAt: todayISO(),
  };
}

export function createEmptyData(): AppData {
  return {
    version: 3,
    settings: defaultSettings,
    movements: [],
    debts: [],
    categories: defaultCategories,
    tags: defaultTags,
    updatedAt: todayISO(),
  };
}
