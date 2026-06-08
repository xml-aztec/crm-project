import { Navigate } from "react-router";
import { useState } from "react";
import { useGetCurrentUserQuery, useChangePasswordMutation } from "../store/api/userApi";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UserMetaCard from "../components/UserProfile/UserMetaCard";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
import UserAddressCard from "../components/UserProfile/UserAddressCard";
import UserStatsMetrics from "../components/users/UserStatsMetrics";

export default function UserProfiles() {
  const { data: currentUser, error } = useGetCurrentUserQuery();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'security'>('profile');
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  
  if (error && (error as any).status === 401) {
    return <Navigate to="/signin" />;
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError('Новые пароли не совпадают');
      return;
    }
    if (pwForm.new_password.length < 8) {
      setPwError('Новый пароль должен быть не менее 8 символов');
      return;
    }
    try {
      await changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      }).unwrap();
      setPwSuccess('Пароль успешно изменён');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      setPwError(err?.data?.detail || 'Ошибка при смене пароля');
    }
  };

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
              <button
                onClick={() => setActiveTab('security')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'security'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Безопасность
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
        ) : activeTab === 'stats' ? (
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
              Моя статистика
            </h4>
            <UserStatsMetrics userId={currentUser?.id} />
          </div>
        ) : (
          /* Безопасность — смена пароля */
          <div className="max-w-md">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
              Смена пароля
            </h4>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Текущий пароль
                </label>
                <input
                  type="password"
                  required
                  value={pwForm.current_password}
                  onChange={(e) => setPwForm(p => ({ ...p, current_password: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Новый пароль
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={pwForm.new_password}
                  onChange={(e) => setPwForm(p => ({ ...p, new_password: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Повторите новый пароль
                </label>
                <input
                  type="password"
                  required
                  value={pwForm.confirm_password}
                  onChange={(e) => setPwForm(p => ({ ...p, confirm_password: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {pwError && (
                <p className="text-sm text-red-600 dark:text-red-400">{pwError}</p>
              )}
              {pwSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">{pwSuccess}</p>
              )}

              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {isChangingPassword ? 'Сохранение...' : 'Изменить пароль'}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
