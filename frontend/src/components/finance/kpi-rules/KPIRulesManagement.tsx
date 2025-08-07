import React, { useState, useMemo, useCallback } from 'react';
import { 
  useGetKPIRulesQuery,
  useCreateKPIRuleMutation,
  useUpdateKPIRuleMutation,
  useDeleteKPIRuleMutation,
  KPIRule
} from '../../../store/api/kpiRulesApi';
import DeleteConfirmModal from '../../ui/DeleteConfirmModal';
import { useFormatting } from '../shared/hooks/useFormatting';
import { RuleFormData, RuleFormErrors, RulesStats } from './types';
import KPIRulesForm from './KPIRulesForm';
import KPIRulesTable from './KPIRulesTable';
import KPIRulesStatistics from './KPIRulesStatistics';

const KPIRulesManagement: React.FC = () => {
  const { formatAmount } = useFormatting();
  
  // Состояние для формы
  const [ruleFormData, setRuleFormData] = useState<RuleFormData>({
    min_percent: '',
    bonus: '',
    penalty: ''
  });
  
  const [errors, setErrors] = useState<RuleFormErrors>({});
  
  // Состояние для редактирования и удаления
  const [editingRule, setEditingRule] = useState<KPIRule | null>(null);
  const [deleteRuleConfirm, setDeleteRuleConfirm] = useState<KPIRule | null>(null);

  // API запросы
  const { 
    data: kpiRules = [], 
    isLoading: rulesLoading, 
    error: rulesError
  } = useGetKPIRulesQuery();
  
  // Мутации
  const [createRule, { isLoading: isCreatingRule }] = useCreateKPIRuleMutation();
  const [updateRule, { isLoading: isUpdatingRule }] = useUpdateKPIRuleMutation();
  const [deleteRule, { isLoading: isDeletingRule }] = useDeleteKPIRuleMutation();

  const isSubmittingRule = isCreatingRule || isUpdatingRule;

  // Статистика KPI правил
  const rulesStats: RulesStats = useMemo(() => {
    const totalRules = kpiRules.length;
    const withBonus = kpiRules.filter(rule => rule.bonus > 0).length;
    const withPenalty = kpiRules.filter(rule => rule.penalty > 0).length;
    const averageThreshold = totalRules > 0 
      ? Math.round(kpiRules.reduce((sum, rule) => sum + rule.min_percent, 0) / totalRules)
      : 0;

    return {
      totalRules,
      withBonus,
      withPenalty,
      averageThreshold
    };
  }, [kpiRules]);

  // Валидация формы KPI правил
  const validateRuleForm = useCallback((): boolean => {
    const newErrors: RuleFormErrors = {};
    
    if (!ruleFormData.min_percent) {
      newErrors.min_percent = 'Введите минимальный процент';
    } else if (parseFloat(ruleFormData.min_percent) < 0 || parseFloat(ruleFormData.min_percent) > 1000) {
      newErrors.min_percent = 'Процент должен быть от 0 до 1000';
    }
    
    if (!ruleFormData.bonus) {
      newErrors.bonus = 'Введите размер бонуса';
    } else if (parseFloat(ruleFormData.bonus) < 0) {
      newErrors.bonus = 'Бонус не может быть отрицательным';
    }
    
    if (!ruleFormData.penalty) {
      newErrors.penalty = 'Введите размер штрафа';
    } else if (parseFloat(ruleFormData.penalty) < 0) {
      newErrors.penalty = 'Штраф не может быть отрицательным';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [ruleFormData]);

  // Обработчик отправки формы KPI правил
  const handleRuleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateRuleForm()) return;
    
    try {
      if (editingRule) {
        await updateRule({
          id: editingRule.id,
          data: {
            min_percent: parseFloat(ruleFormData.min_percent),
            bonus: parseFloat(ruleFormData.bonus),
            penalty: parseFloat(ruleFormData.penalty)
          }
        }).unwrap();
      } else {
        await createRule({
          min_percent: parseFloat(ruleFormData.min_percent),
          bonus: parseFloat(ruleFormData.bonus),
          penalty: parseFloat(ruleFormData.penalty)
        }).unwrap();
      }
      
      // Сброс формы
      setRuleFormData({
        min_percent: '',
        bonus: '',
        penalty: ''
      });
      setEditingRule(null);
      setErrors({});
      
    } catch (error) {
      // Ошибка обработана в middleware
    }
  }, [editingRule, ruleFormData, validateRuleForm, updateRule, createRule]);

  // Обработчики для KPI правил
  const handleEditRule = useCallback((rule: KPIRule) => {
    setEditingRule(rule);
    setRuleFormData({
      min_percent: rule.min_percent.toString(),
      bonus: rule.bonus.toString(),
      penalty: rule.penalty.toString()
    });
    setErrors({});
  }, []);

  const handleCancelRuleEdit = useCallback(() => {
    setEditingRule(null);
    setRuleFormData({
      min_percent: '',
      bonus: '',
      penalty: ''
    });
    setErrors({});
  }, []);

  // Обработчик удаления
  const handleDeleteRule = useCallback(async () => {
    if (!deleteRuleConfirm) return;
    
    try {
      await deleteRule(deleteRuleConfirm.id).unwrap();
      setDeleteRuleConfirm(null);
    } catch (error) {
      // Ошибка обработана в middleware
    }
  }, [deleteRuleConfirm, deleteRule]);

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <KPIRulesStatistics
        stats={rulesStats}
      />

      {/* Форма создания/редактирования правила */}
      <KPIRulesForm
        formData={ruleFormData}
        errors={errors}
        editingRule={editingRule}
        isSubmitting={isSubmittingRule}
        onFormDataChange={setRuleFormData}
        onSubmit={handleRuleSubmit}
        onCancel={handleCancelRuleEdit}
      />

      {/* Таблица правил */}
      <KPIRulesTable
        rules={kpiRules}
        isLoading={rulesLoading}
        error={rulesError}
        formatAmount={formatAmount}
        onEdit={handleEditRule}
        onDelete={setDeleteRuleConfirm}
        isDeletingRule={isDeletingRule}
      />

      {/* Модальное окно подтверждения удаления */}
      {deleteRuleConfirm && (
        <DeleteConfirmModal
          isOpen={!!deleteRuleConfirm}
          onClose={() => setDeleteRuleConfirm(null)}
          onConfirm={handleDeleteRule}
          title="Подтвердите удаление правила KPI"
          itemName={`правило KPI (${deleteRuleConfirm.min_percent}% = ${formatAmount(deleteRuleConfirm.bonus)} бонус / ${formatAmount(deleteRuleConfirm.penalty)} штраф)`}
          confirmText="Удалить правило"
          isLoading={isDeletingRule}
        />
      )}
    </div>
  );
};

export default KPIRulesManagement;