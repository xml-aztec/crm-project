import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Pagination from "../../components/common/Pagination";
import UsersTable from "../../components/users/UsersTable";
import { useGetUsersPaginatedQuery } from "../../store/api/usersManagementApi";
import { useGetRolesQuery, useGetPositionsQuery } from "../../store/api/rolesPositionsApi";
import { useTableUrlState } from "../../hooks/useTableUrlState";
import CatalogSearchInput from "../../components/catalog/CatalogSearchInput";

const PAGE_SIZE = 20;

export default function Users() {
  const { page, search, sortBy, sortOrder, filters, setPage, setSearch, setFilter, reset } = useTableUrlState({
    prefix: 'user',
    defaultSortBy: 'full_name',
    defaultFilters: { role_id: '', status: '' },
  });

  const { data, isLoading: usersLoading, isFetching, error: usersError } = useGetUsersPaginatedQuery({
    search: search || undefined,
    role_id: filters.role_id ? Number(filters.role_id) : undefined,
    is_active: filters.status === 'active' ? true : filters.status === 'inactive' ? false : undefined,
    sort_by: sortBy as 'full_name' | 'email' | 'created_at',
    sort_order: sortOrder,
    page,
    page_size: PAGE_SIZE,
  });
  const { data: roles = [], isLoading: rolesLoading } = useGetRolesQuery();
  const { data: positions = [], isLoading: positionsLoading } = useGetPositionsQuery();

  const users = data?.items ?? [];
  const isLoading = usersLoading || rolesLoading || positionsLoading;
  const hasActiveFilters = !!search || !!filters.role_id || !!filters.status;

  if (usersError) {
    return (
      <>
        <PageBreadCrumb pageTitle="Все пользователи" />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">
            Ошибка при загрузке пользователей: {(usersError as { data?: { detail?: string } })?.data?.detail || 'Неизвестная ошибка'}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageBreadCrumb pageTitle="Все пользователи" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        {/* Header with title and stats */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Управление пользователями
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Управляйте пользователями системы и их правами доступа
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Найдено: <span className="font-medium text-gray-900 dark:text-white">{data?.total ?? 0}</span>
            </div>
            {(isLoading || isFetching) && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-brand-500"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Загрузка...</span>
              </div>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Фильтры</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Поиск пользователей
              </label>
              <CatalogSearchInput
                value={search}
                onChange={setSearch}
                placeholder="Поиск по имени или email..."
              />
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Статус
              </label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => setFilter('status', e.target.value)}
                className="w-full h-11 px-4 border border-gray-300 rounded-lg bg-transparent focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Все статусы</option>
                <option value="active">Активные</option>
                <option value="inactive">Неактивные</option>
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Роль
              </label>
              <select
                id="role"
                value={filters.role_id}
                onChange={(e) => setFilter('role_id', e.target.value)}
                disabled={rolesLoading}
                className="w-full h-11 px-4 border border-gray-300 rounded-lg bg-transparent focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
              >
                <option value="">Все роли</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id.toString()}>{role.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={reset}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>

        <UsersTable
          users={users}
          isLoading={usersLoading}
          roles={roles}
          positions={positions}
        />

        {data && (
          <Pagination page={page} totalPages={data.total_pages} total={data.total} onPageChange={setPage} />
        )}
      </div>
    </>
  );
}
