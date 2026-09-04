/**
 * Расчёт и проверка зарплатной ведомости.
 *
 * Было внутри PayrollModal.tsx (703 строки) вперемешку с состоянием формы и
 * версткой.
 *
 * ВАЖНО про формулу. Сервер считает итог как `оклад + премия − штраф`
 * (backend/app/repositories/payroll.py, три места: generate_payrolls_for_month,
 * recalculate_payroll и pay_salary). Модалка же умножала результат на
 * `kpi_percent / 100`, то есть показывала пользователю сумму, отличную от той,
 * что сохранится в базе, — при выполнении плана на 87% предпросмотр занижал
 * выплату на 13%. Множителя здесь больше нет.
 *
 * `kpi_percent` на сервере — это ЗАПИСЬ факта выполнения плана, по которой
 * подбирается правило; само правило уже задаёт премию или штраф. Второй раз
 * применять процент нельзя.
 */

export interface PayrollFormValues {
  base_salary: string;
  bonus_amount: string;
  penalty_amount: string;
  kpi_percent?: string;
  kpi_rule_id?: string;
  user_id?: string;
  month?: string;
}

export type PayrollFormErrors = Partial<Record<keyof PayrollFormValues, string>>;

function toNumber(value: string | undefined): number {
  const parsed = parseFloat(value || '0');
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Итог к выплате — ровно та же формула, что и на сервере. */
export function calculatePayrollTotal(values: PayrollFormValues): number {
  const total =
    toNumber(values.base_salary) +
    toNumber(values.bonus_amount) -
    toNumber(values.penalty_amount);

  // Отрицательная выплата невозможна: штраф не может превысить начисление.
  return Math.max(0, total);
}

function isInvalidNonNegative(value: string | undefined): boolean {
  if (!value) return false;
  const parsed = Number(value);
  return Number.isNaN(parsed) || parsed < 0;
}

export function validatePayrollForm(
  values: PayrollFormValues,
  { isEditMode }: { isEditMode: boolean },
): PayrollFormErrors {
  const errors: PayrollFormErrors = {};

  // Сотрудник и месяц выбираются только при создании: у существующей
  // ведомости они уже зафиксированы и не редактируются.
  if (!isEditMode && !values.user_id) errors.user_id = 'Выберите сотрудника';
  if (!isEditMode && !values.month) errors.month = 'Выберите месяц';

  if (
    !values.base_salary ||
    Number.isNaN(Number(values.base_salary)) ||
    Number(values.base_salary) < 0
  ) {
    errors.base_salary = 'Введите корректную базовую зарплату';
  }

  if (isInvalidNonNegative(values.bonus_amount)) {
    errors.bonus_amount = 'Введите корректную сумму бонуса';
  }

  if (isInvalidNonNegative(values.penalty_amount)) {
    errors.penalty_amount = 'Введите корректную сумму штрафа';
  }

  if (values.kpi_percent) {
    const kpi = Number(values.kpi_percent);
    if (Number.isNaN(kpi) || kpi < 0 || kpi > 1000) {
      errors.kpi_percent = 'Введите корректный процент KPI (0-1000%)';
    }
  }

  if (values.kpi_rule_id) {
    const ruleId = Number(values.kpi_rule_id);
    if (Number.isNaN(ruleId) || ruleId <= 0) {
      errors.kpi_rule_id = 'Введите корректный ID правила KPI';
    }
  }

  return errors;
}

/** Цвет подсветки процента выполнения плана. */
export function kpiColorClass(kpiPercent?: number): string {
  if (!kpiPercent) return 'text-gray-500';
  if (kpiPercent >= 120) return 'text-green-600';
  if (kpiPercent >= 100) return 'text-green-500';
  if (kpiPercent >= 80) return 'text-yellow-500';
  return 'text-red-500';
}
