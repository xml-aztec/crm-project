import { useNavigate } from "react-router";
import { asApiError } from '../../types/apiError';
import { useGetCurrentUserQuery } from "../../store/api/userApi";
import { useGetRolesQuery, useGetPositionsQuery } from "../../store/api/rolesPositionsApi";

export default function UserInfoCard() {
  const navigate = useNavigate();

  // Получение данных пользователя
  const { data: currentUser, isLoading: userLoading, error: userError } = useGetCurrentUserQuery();
  
  // Получение списков ролей и должностей
  const { data: roles = [], isLoading: rolesLoading } = useGetRolesQuery();
  const { data: positions = [], isLoading: positionsLoading } = useGetPositionsQuery();

  // Находим названия роли и должности по ID
  const roleName = currentUser?.role?.name || 
    (currentUser?.role_id ? roles.find(r => r.id === currentUser.role_id)?.name : null) || 
    "Пользователь";
    
  const positionName = currentUser?.position?.name || 
    (currentUser?.position_id ? positions.find(p => p.id === currentUser.position_id)?.name : null) || 
    "Не указана";

  // Показываем лоадер пока данные загружаются
  const isLoading = userLoading || rolesLoading || positionsLoading;
  if (isLoading) {
    return (
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  // Обработка ошибок
  if (userError) {
    const errorStatus = asApiError(userError).status;
    
    // Если ошибка авторизации - редирект на логин
    if (errorStatus === 401) {
      navigate("/signin");
      return null;
    }
    
    // Иначе покажем сообщение об ошибке
    return (
      <div className="p-5 border border-error-200 rounded-2xl dark:border-error-800 lg:p-6">
        <p className="text-error-500 dark:text-error-400">Не удалось загрузить данные пользователя</p>
      </div>
    );
  }

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
        Личная информация
      </h4>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
            ФИО
          </p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {currentUser?.full_name || "—"}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
            Email
          </p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {currentUser?.email || "—"}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
            Телефон
          </p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {currentUser?.phone || "—"}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
            Должность
          </p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {positionName}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
            Роль
          </p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {roleName}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
            Статус аккаунта
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                currentUser?.is_active
                  ? "bg-success-500"
                  : "bg-error-500"
              }`}
            ></span>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {currentUser?.is_active ? "Активен" : "Не активен"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}