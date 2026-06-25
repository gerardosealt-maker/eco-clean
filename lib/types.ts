export type MovementType = "Venta" | "Ingreso extra" | "Compra" | "Gasto" | "Pago de deuda";
export type DebtStatus = "Pendiente" | "En proceso" | "Pagada" | "Vencida";

export type Category = {
  id: string;
  name: string;
  kind: "Ingreso" | "Egreso" | "Deuda";
  color: string;
  icon: string;
  active: boolean;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
  icon: string;
  active: boolean;
};

export type Movement = {
  id: string;
  date: string;
  type: MovementType;
  category: string;
  concept: string;
  amount: number;
  paymentMethod: string;
  tags?: string[];
  debtId?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
};

export type Debt = {
  id: string;
  creditor: string;
  concept: string;
  originalAmount: number;
  paidAmount: number;
  startDate: string;
  dueDate: string;
  status: DebtStatus;
  note?: string;
  createdAt: string;
  updatedAt?: string;
};

export type Settings = {
  businessName: string;
  ownerName: string;
  city: string;
  businessType: string;
  currency: "MXN";
  monthlySalesGoal: number;
  dailySalesGoal: number;
  maxMonthlyExpenses: number;
  lowGoalThreshold: number;
  midGoalThreshold: number;
  paymentMethods: string[];
};

export type AppData = {
  version: 3;
  settings: Settings;
  movements: Movement[];
  debts: Debt[];
  categories: Category[];
  tags: Tag[];
  updatedAt: string;
};

export type DashboardSummary = {
  salesToday: number;
  salesMonth: number;
  extraIncomeMonth: number;
  expensesMonth: number;
  purchasesMonth: number;
  debtPaymentsMonth: number;
  outflowsMonth: number;
  estimatedProfit: number;
  pendingDebt: number;
  goalProgress: number;
  averageDailySales: number;
  bestSalesDay: string;
  bestSalesDayAmount: number;
  topExpenseCategory: string;
  topExpenseAmount: number;
  overdueDebts: number;
  upcomingDebts: number;
};

export type MonthChartPoint = {
  label: string;
  ventas: number;
  egresos: number;
  utilidad: number;
};

export type CategoryChartPoint = {
  name: string;
  value: number;
};
