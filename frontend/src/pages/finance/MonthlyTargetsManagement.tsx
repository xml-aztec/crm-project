import React, { useState } from "react";
import { useNavigate } from "react-router";
import Button from "../../components/ui/button/Button";
import TargetsManagement from "../../components/finance/targets/TargetsManagement";
import KPIRulesManagement from "../../components/finance/kpi-rules/KPIRulesManagement";

type TabType = "targets" | "rules";

const MonthlyTargetsManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("targets");

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Управление KPI менеджеров
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Планирование целей продаж и настройка системы мотивации менеджеров
          </p>
        </div>

        <Button
          onClick={() => navigate("/finance")}
          variant="outline"
          className="flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Назад к финансам
        </Button>
      </div>

      {/* Навигация по табам */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab("targets")}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === "targets"
                ? "bg-blue-500 text-white shadow-md"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            🎯 Цели продаж
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === "rules"
                ? "bg-blue-500 text-white shadow-md"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            ⚙️ Правила KPI
          </button>
        </div>

        {/* Индикатор активной вкладки */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {activeTab === "targets" ? (
            <p>📊 Управление целями продаж менеджеров по месяцам</p>
          ) : (
            <p>
              🎛️ Настройка правил начисления бонусов и штрафов на основе
              выполнения KPI
            </p>
          )}
        </div>
      </div>

      {/* Контент для табов */}
      {activeTab === "targets" && <TargetsManagement />}
      {activeTab === "rules" && <KPIRulesManagement />}
    </div>
  );
};

export default MonthlyTargetsManagement;
