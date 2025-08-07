export interface RuleFormData {
  min_percent: string;
  bonus: string;
  penalty: string;
}

export interface RuleFormErrors {
  min_percent?: string;
  bonus?: string;
  penalty?: string;
}

export interface RulesStats {
  totalRules: number;
  withBonus: number;
  withPenalty: number;
  averageThreshold: number;
}