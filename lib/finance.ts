import type { AppData, CategoryChartPoint, DashboardSummary, Debt, DebtStatus, MonthChartPoint, Movement } from "./types";

export const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export const numberFormatter = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 0,
});

export function money(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

export function percent(value: number) {
  return `${Math.round(Number.isFinite(value) ? value : 0)}%`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export function isSameMonth(date: string, selectedMonth: string) {
  return date?.slice(0, 7) === selectedMonth;
}

export function parseNumber(value: string | number) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = value.replace(/[$,\s]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function debtBalance(debt: Debt) {
  return Math.max(0, debt.originalAmount - debt.paidAmount);
}

export function paidProgress(debt: Debt) {
  if (debt.originalAmount <= 0) return 100;
  return Math.min(100, (debt.paidAmount / debt.originalAmount) * 100);
}

export function computedDebtStatus(debt: Debt, today = todayISO()): DebtStatus {
  if (debtBalance(debt) <= 0) return "Pagada";
  if (debt.dueDate && debt.dueDate < today) return "Vencida";
  if (debt.paidAmount > 0) return "En proceso";
  return debt.status || "Pendiente";
}

export function getMonthMovements(data: AppData, selectedMonth: string) {
  return data.movements.filter((movement) => isSameMonth(movement.date, selectedMonth));
}

export function getSummary(data: AppData, selectedMonth: string): DashboardSummary {
  const monthMovements = getMonthMovements(data, selectedMonth);
  const today = todayISO();
  const todayMovements = data.movements.filter((movement) => movement.date === today);

  const sum = (items: Movement[], predicate: (movement: Movement) => boolean) =>
    items.filter(predicate).reduce((total, movement) => total + movement.amount, 0);

  const salesToday = sum(todayMovements, (movement) => movement.type === "Venta");
  const salesMonth = sum(monthMovements, (movement) => movement.type === "Venta");
  const extraIncomeMonth = sum(monthMovements, (movement) => movement.type === "Ingreso extra");
  const expensesMonth = sum(monthMovements, (movement) => movement.type === "Gasto");
  const purchasesMonth = sum(monthMovements, (movement) => movement.type === "Compra");
  const debtPaymentsMonth = sum(monthMovements, (movement) => movement.type === "Pago de deuda");
  const outflowsMonth = expensesMonth + purchasesMonth + debtPaymentsMonth;
  const estimatedProfit = salesMonth + extraIncomeMonth - outflowsMonth;
  const pendingDebt = data.debts.reduce((total, debt) => total + debtBalance(debt), 0);
  const goalProgress = data.settings.monthlySalesGoal > 0 ? (salesMonth / data.settings.monthlySalesGoal) * 100 : 0;

  const salesByDay = aggregateByDay(monthMovements).map((point) => ({ date: point.date, sales: point.ventas }));
  const daysWithSales = salesByDay.filter((point) => point.sales > 0);
  const best = daysWithSales.sort((a, b) => b.sales - a.sales)[0];
  const averageDailySales = daysWithSales.length ? salesMonth / daysWithSales.length : 0;
  const categoryChart = getExpenseCategoryChart(data, selectedMonth);
  const topExpense = [...categoryChart].sort((a, b) => b.value - a.value)[0];

  const activeDebts = data.debts.filter((debt) => debtBalance(debt) > 0);
  const overdueDebts = activeDebts.filter((debt) => computedDebtStatus(debt) === "Vencida").length;
  const upcomingDebts = activeDebts.filter((debt) => {
    if (!debt.dueDate) return false;
    const ms = new Date(debt.dueDate).getTime() - new Date(today).getTime();
    return ms >= 0 && ms <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  return {
    salesToday,
    salesMonth,
    extraIncomeMonth,
    expensesMonth,
    purchasesMonth,
    debtPaymentsMonth,
    outflowsMonth,
    estimatedProfit,
    pendingDebt,
    goalProgress,
    averageDailySales,
    bestSalesDay: best?.date || "Sin ventas",
    bestSalesDayAmount: best?.sales || 0,
    topExpenseCategory: topExpense?.name || "Sin gastos",
    topExpenseAmount: topExpense?.value || 0,
    overdueDebts,
    upcomingDebts,
  };
}

export function aggregateByDay(movements: Movement[]) {
  const map = new Map<string, { date: string; ventas: number; egresos: number; utilidad: number }>();
  for (const movement of movements) {
    if (!map.has(movement.date)) map.set(movement.date, { date: movement.date, ventas: 0, egresos: 0, utilidad: 0 });
    const item = map.get(movement.date)!;
    if (movement.type === "Venta" || movement.type === "Ingreso extra") {
      item.ventas += movement.amount;
      item.utilidad += movement.amount;
    } else {
      item.egresos += movement.amount;
      item.utilidad -= movement.amount;
    }
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function getDailyChart(data: AppData, selectedMonth: string): MonthChartPoint[] {
  const year = Number(selectedMonth.slice(0, 4));
  const month = Number(selectedMonth.slice(5, 7));
  const lastDay = new Date(year, month, 0).getDate();
  const aggregated = new Map(aggregateByDay(getMonthMovements(data, selectedMonth)).map((point) => [point.date, point]));

  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
    const point = aggregated.get(date);
    return {
      label: String(day),
      ventas: point?.ventas || 0,
      egresos: point?.egresos || 0,
      utilidad: point?.utilidad || 0,
    };
  });
}

export function getExpenseCategoryChart(data: AppData, selectedMonth: string): CategoryChartPoint[] {
  const map = new Map<string, number>();
  const expenseTypes = new Set(["Compra", "Gasto", "Pago de deuda"]);
  getMonthMovements(data, selectedMonth)
    .filter((movement) => expenseTypes.has(movement.type))
    .forEach((movement) => {
      map.set(movement.category, (map.get(movement.category) || 0) + movement.amount);
    });

  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function getMonthlyTrend(data: AppData) {
  const map = new Map<string, { month: string; ingresos: number; egresos: number; utilidad: number }>();
  for (const movement of data.movements) {
    const key = movement.date.slice(0, 7);
    if (!map.has(key)) map.set(key, { month: key, ingresos: 0, egresos: 0, utilidad: 0 });
    const item = map.get(key)!;
    if (movement.type === "Venta" || movement.type === "Ingreso extra") {
      item.ingresos += movement.amount;
      item.utilidad += movement.amount;
    } else {
      item.egresos += movement.amount;
      item.utilidad -= movement.amount;
    }
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
}

export function buildAlerts(data: AppData, selectedMonth: string) {
  const summary = getSummary(data, selectedMonth);
  const alerts: { title: string; body: string; tone: "good" | "warn" | "bad" | "info" }[] = [];

  if (summary.estimatedProfit < 0) {
    alerts.push({ title: "Utilidad negativa", body: "Este mes las salidas superan a los ingresos. Conviene revisar compras y gastos fuertes.", tone: "bad" });
  }
  if (summary.expensesMonth + summary.purchasesMonth > data.settings.maxMonthlyExpenses) {
    alerts.push({ title: "Gastos sobre presupuesto", body: `Los gastos y compras ya superaron el límite mensual de ${money(data.settings.maxMonthlyExpenses)}.`, tone: "warn" });
  }
  if (summary.overdueDebts > 0) {
    alerts.push({ title: "Deudas vencidas", body: `${summary.overdueDebts} deuda(s) aparecen vencidas.`, tone: "bad" });
  }
  if (summary.upcomingDebts > 0) {
    alerts.push({ title: "Pagos próximos", body: `${summary.upcomingDebts} deuda(s) vencen en los próximos 7 días.`, tone: "warn" });
  }
  if (summary.goalProgress >= 80) {
    alerts.push({ title: "Buen avance de meta", body: `El negocio lleva ${percent(summary.goalProgress)} de la meta mensual.`, tone: "good" });
  } else if (summary.goalProgress < 50) {
    alerts.push({ title: "Venta por debajo del ritmo", body: `El avance de ventas va en ${percent(summary.goalProgress)}.`, tone: "warn" });
  }
  if (alerts.length === 0) {
    alerts.push({ title: "Todo estable", body: "La captura está limpia y no hay alertas críticas por ahora.", tone: "good" });
  }

  return alerts;
}

export function exportMovementsCSV(movements: Movement[]) {
  const headers = ["Fecha", "Tipo", "Categoria", "Concepto", "Monto", "Metodo de pago", "Etiquetas", "Nota"];
  const rows = movements.map((m) => [m.date, m.type, m.category, m.concept, String(m.amount), m.paymentMethod, (m.tags || []).join(" | "), m.note || ""]);
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}
