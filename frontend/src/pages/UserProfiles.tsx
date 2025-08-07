import { Navigate } from "react-router";
import { useState } from "react";
import { useGetCurrentUserQuery } from "../store/api/userApi";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UserMetaCard from "../components/UserProfile/UserMetaCard";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
import UserAddressCard from "../components/UserProfile/UserAddressCard";
import UserStatsMetrics from "../components/users/UserStatsMetrics";

export default function UserProfiles() {
  // Получаем данные текущего пользователя для установки заголовка и обработки ошибок
  const { data: currentUser, error } = useGetCurrentUserQuery();
  
  // Состояние для активной вкладки
  const [activeTab, setActiveTab] = useState<'profile' | 'stats'>('profile');
  
  // При ошибке авторизации перенаправляем на страницу логина
  if (error && (error as any).status === 401) {
    return <Navigate to="/signin" />;
  }

  return (
    <>
      <PageBreadcrumb pageTitle="Мой профиль" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          {currentUser ? `Профиль: ${currentUser.full_name}` : "Мой профиль"}
        </h3>

        {/* Табы */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Профиль
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'stats'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Моя статистика
              </button>
            </nav>
          </div>
        </div>

        {/* Контент вкладок */}
        {activeTab === 'profile' ? (
          /* Профиль пользователя */
          <div className="space-y-6">
            <UserMetaCard />
            <UserInfoCard />
            <UserAddressCard />
          </div>
        ) : (
          /* Статистика пользователя */
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
              Моя статистика
            </h4>
            <UserStatsMetrics userId={currentUser?.id} />
          </div>
        )}
      </div>
    </>
  );
}
