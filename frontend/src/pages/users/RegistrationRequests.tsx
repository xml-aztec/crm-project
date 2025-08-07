import { useState } from 'react';
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import PendingUsersTable from "../../components/users/PendingUsersTable";
import { useGetPendingUsersQuery } from "../../store/api/usersManagementApi";
import { useGetRolesQuery, useGetPositionsQuery } from "../../store/api/rolesPositionsApi";
import { CalenderIcon } from "../../icons";

export default function RegistrationRequests() {
  const { data: pendingUsers = [], isLoading: usersLoading, error: usersError } = useGetPendingUsersQuery();
  const { data: roles = [], isLoading: rolesLoading } = useGetRolesQuery();
  const { data: positions = [], isLoading: positionsLoading } = useGetPositionsQuery(); // Для таблицы
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Фильтрация заявок (без должности в фильтрах)
  const filteredUsers = pendingUsers.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || 
                       user.role?.id.toString() === roleFilter ||
                       user.role_id?.toString() === roleFilter;

    let matchesDate = true;
    if (dateFilter !== 'all') {
      const userDate = new Date(user.created_at);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - userDate.getTime()) / (1000 * 60 * 60 * 24));

      switch (dateFilter) {
        case 'today':
          matchesDate = daysDiff === 0;
          break;
        case 'week':
          matchesDate = daysDiff <= 7;
          break;
        case 'month':
          matchesDate = daysDiff <= 30;
          break;
      }
    }

    return matchesSearch && matchesRole && matchesDate;
  });

  const isLoading = usersLoading || rolesLoading || positionsLoading; // Включаем positions

  if (usersError) {
    return (
      <>
        <PageBreadCrumb pageTitle="Запросы регистрации" />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">
            Ошибка при загрузке запросов: {(usersError as any)?.data?.detail || 'Неизвестная ошибка'}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageBreadCrumb pageTitle="Запросы регистрации" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        {/* Header with title and stats */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Заявки на регистрацию
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Управляйте заявками пользователей на регистрацию в системе
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Ожидают: <span className="font-medium text-orange-600 dark:text-orange-400">{filteredUsers.length}</span> из {pendingUsers.length}
            </div>
            {pendingUsers.length > 0 && (
              <div className="px-3 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 rounded-full text-xs font-medium">
                Требуется внимание
              </div>
            )}
            {isLoading && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-brand-500"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Загрузка...</span>
              </div>
            )}
          </div>
        </div>

        {/* Filters and Search - только 3 фильтра */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Фильтры заявок</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="relative">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Поиск заявок
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  placeholder="Поиск по имени или email..."
                />
              </div>
            </div>

            {/* Role Filter */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Роль
              </label>
              <select
                id="role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                disabled={rolesLoading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
              >
                <option value="all">Все роли</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id.toString()}>{role.name}</option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Период подачи
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CalenderIcon className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="all">Все время</option>
                  <option value="today">Сегодня</option>
                  <option value="week">Последняя неделя</option>
                  <option value="month">Последний месяц</option>
                </select>
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(searchTerm || roleFilter !== 'all' || dateFilter !== 'all') && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('all');
                  setDateFilter('all');
                }}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>
        
        {/* Передаем positions в таблицу */}
        <PendingUsersTable 
          users={filteredUsers} 
          isLoading={usersLoading}
          roles={roles}
          positions={positions}
        />
      </div>
    </>
  );
}