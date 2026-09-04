import { describe, expect, it } from 'vitest';

import {
  calculatePayrollTotal,
  kpiColorClass,
  validatePayrollForm,
  type PayrollFormValues,
} from './payrollCalc';

const values = (over: Partial<PayrollFormValues> = {}): PayrollFormValues => ({
  base_salary: '50000',
  bonus_amount: '5000',
  penalty_amount: '2000',
  ...over,
});

describe('calculatePayrollTotal', () => {
  it('считает оклад плюс премия минус штраф', () => {
    expect(calculatePayrollTotal(values())).toBe(53000);
  });

  it('НЕ умножает итог на процент KPI', () => {
    // Ровно то расхождение с сервером, ради которого расчёт вынесен сюда:
    // модалка показывала 53000 * 0.87, тогда как сервер сохраняет 53000.
    expect(calculatePayrollTotal(values({ kpi_percent: '87' }))).toBe(53000);
    expect(calculatePayrollTotal(values({ kpi_percent: '150' }))).toBe(53000);
  });

  it('не уходит в минус, когда штраф больше начислений', () => {
    expect(calculatePayrollTotal(values({ base_salary: '1000', bonus_amount: '0', penalty_amount: '5000' }))).toBe(0);
  });

  it('трактует пустые и нечисловые поля как ноль', () => {
    expect(calculatePayrollTotal({ base_salary: '50000', bonus_amount: '', penalty_amount: '' })).toBe(50000);
    expect(calculatePayrollTotal({ base_salary: '50000', bonus_amount: 'abc', penalty_amount: '' })).toBe(50000);
  });
});

describe('validatePayrollForm', () => {
  it('на корректной форме не находит ошибок', () => {
    expect(validatePayrollForm(values({ user_id: '1', month: '2026-09' }), { isEditMode: false })).toEqual({});
  });

  it('требует сотрудника и месяц только при создании', () => {
    const onCreate = validatePayrollForm(values(), { isEditMode: false });
    expect(onCreate.user_id).toBeDefined();
    expect(onCreate.month).toBeDefined();

    const onEdit = validatePayrollForm(values(), { isEditMode: true });
    expect(onEdit.user_id).toBeUndefined();
    expect(onEdit.month).toBeUndefined();
  });

  it('требует корректный оклад', () => {
    expect(validatePayrollForm(values({ base_salary: '' }), { isEditMode: true }).base_salary).toBeDefined();
    expect(validatePayrollForm(values({ base_salary: '-5' }), { isEditMode: true }).base_salary).toBeDefined();
    expect(validatePayrollForm(values({ base_salary: 'abc' }), { isEditMode: true }).base_salary).toBeDefined();
  });

  it('премия и штраф необязательны, но при заполнении должны быть неотрицательными', () => {
    expect(validatePayrollForm(values({ bonus_amount: '' }), { isEditMode: true }).bonus_amount).toBeUndefined();
    expect(validatePayrollForm(values({ bonus_amount: '-1' }), { isEditMode: true }).bonus_amount).toBeDefined();
    expect(validatePayrollForm(values({ penalty_amount: '-1' }), { isEditMode: true }).penalty_amount).toBeDefined();
  });

  it('ограничивает процент KPI диапазоном 0–1000', () => {
    expect(validatePayrollForm(values({ kpi_percent: '1001' }), { isEditMode: true }).kpi_percent).toBeDefined();
    expect(validatePayrollForm(values({ kpi_percent: '-1' }), { isEditMode: true }).kpi_percent).toBeDefined();
    expect(validatePayrollForm(values({ kpi_percent: '87.35' }), { isEditMode: true }).kpi_percent).toBeUndefined();
  });
});

describe('kpiColorClass', () => {
  it('различает уровни выполнения плана', () => {
    expect(kpiColorClass(130)).toBe('text-green-600');
    expect(kpiColorClass(105)).toBe('text-green-500');
    expect(kpiColorClass(85)).toBe('text-yellow-500');
    expect(kpiColorClass(40)).toBe('text-red-500');
  });

  it('без значения даёт нейтральный цвет', () => {
    expect(kpiColorClass(undefined)).toBe('text-gray-500');
    expect(kpiColorClass(0)).toBe('text-gray-500');
  });
});
