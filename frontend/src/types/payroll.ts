export interface Payroll {
  id: number;
  user_id: number;
  month: string;
  base_salary: number;
  bonus_amount?: number;
  penalty_amount?: number;
  kpi_percent?: number;
  kpi_rule_id?: number;
  total_paid: number;
  comment?: string;
  paid_at?: string;
  created_at: string;
  updated_at?: string; 
  user?: {
    id: number;
    full_name: string;
    email?: string;
    position?: {
      id: number;
      name: string;
    };
    role?: {
      id: number;
      name: string;
    };
  };
}

export interface PayrollCreate {
  user_id: number;
  month: string;
  base_salary: number;
  bonus_amount?: number;
  penalty_amount?: number;
  kpi_percent?: number;
  kpi_rule_id?: number;
  comment?: string;
}

export interface PayrollUpdate {
  base_salary?: number;
  bonus_amount?: number;
  penalty_amount?: number;
  kpi_percent?: number;
  kpi_rule_id?: number;
  comment?: string;
}

export interface UpdatePayrollRequest {
  base_salary?: number;
  bonus_amount?: number;
  penalty_amount?: number;
  kpi_percent?: number;
  kpi_rule_id?: number;
  comment?: string;
}