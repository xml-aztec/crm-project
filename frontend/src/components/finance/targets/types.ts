export interface TargetFormData {
  manager_id: string;
  month: string;
  target_amount: string;
}

export interface FormErrors {
  manager_id?: string;
  month?: string;
  target_amount?: string;
}

export interface TargetStats {
  totalTargets: number;
  completedTargets: number;
  pendingTargets: number;
  totalTargetAmount: number;
  averageCompletion: number;
}