import { useState } from 'react';
import { UserRead, Role, Position } from '../../store/api/userApi';
import { 
  useDeleteUserMutation, 
  useAdminUpdateUserMutation, 
  useAdminToggleUserStatusMutation 
} from '../../store/api/usersManagementApi';
import { TrashBinIcon, PencilIcon } from '../../icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import EditUserModal from "./EditUserModal";

interface UsersTableProps {
  users: UserRead[];
  isLoading: boolean;
  roles: Role[];
  positions: Position[];
}

export default function UsersTable({ users, isLoading, roles, positions }: UsersTableProps) {
  const [deleteUser] = useDeleteUserMutation();
  const [adminUpdateUser, { isLoading: isUpdating }] = useAdminUpdateUserMutation();
  const [adminToggleUserStatus] = useAdminToggleUserStatusMutation();
  
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<UserRead | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    try {
      await deleteUser(id).unwrap();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error);
    }
  };

  const handleEdit = (user: UserRead) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async (userId: number, userData: any) => {
    try {
      await adminUpdateUser({ id: userId, data: userData }).unwrap();
      setIsEditModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      throw error;
    }
  };

  const handleToggleStatus = async (newStatus: boolean, userId: number) => {
    setIsChangingStatus(userId);
    try {
      await adminToggleUserStatus({ id: userId, is_active: newStatus }).unwrap();
    } catch (error) {
      console.error('Ошибка при изменении статуса пользователя:', error);
    } finally {
      setIsChangingStatus(null);
    }
  };

  // Функция для получения названия роли
  const getRoleName = (user: UserRead) => {
    if (user.role?.name) return user.role.name;
    if (user.role_id) {
      const role = roles.find(r => r.id === user.role_id);
      return role?.name || 'Не указано';
    }
    return 'Не указано';
  };

  // Функция для получения названия должности
  const getPositionName = (user: UserRead) => {
    if (user.position?.name) return user.position.name;
    if (user.position_id) {
      const position = positions.find(p => p.id === user.position_id);
      return position?.name || 'Не указано';
    }
    return 'Не указано';
  };

  // Функция для форматирования зарплаты
  const formatSalary = (salary?: number) => {
    if (!salary || salary === 0) return 'Не указана';
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'KGS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(salary).replace('KGS', 'сом');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            {/* Table Header */}
            <TableHeader className="bg-gray-50/80 dark:bg-white/[0.02]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Пользователь
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Контакты
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Роль
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Должность
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Зарплата
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Статус
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Действия
                </TableCell>
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {users.map((user) => (
                <TableRow key={user.id}>
                  {/* Пользователь */}
                  <TableCell className="px-5 py-4 sm:px-6 text-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-900/20 flex items-center justify-center">
                        <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                          {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {user.full_name}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Контакты */}
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    <div>
                      <div className="font-medium text-gray-800 dark:text-white/90">
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="text-theme-xs text-gray-500 dark:text-gray-400">
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Роль */}
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {getRoleName(user)}
                  </TableCell>

                  {/* Должность */}
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {getPositionName(user)}
                  </TableCell>

                  {/* Зарплата */}
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    <span className={`${user.salary_base && user.salary_base > 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-400'}`}>
                      {formatSalary(user.salary_base)}
                    </span>
                  </TableCell>

                  {/* Статус - Вариант 4 */}
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    <button
                      onClick={() => handleToggleStatus(!user.is_active, user.id)}
                      disabled={isChangingStatus === user.id}
                      className="transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 rounded-full"
                      title={`Нажмите чтобы ${user.is_active ? 'деактивировать' : 'активировать'} пользователя`}
                    >
                      <div className={`
                        px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all duration-200
                        ${user.is_active 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-200 hover:dark:bg-green-900/50' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-200 hover:dark:bg-red-900/50'
                        }
                        ${isChangingStatus === user.id ? 'opacity-50 cursor-not-allowed scale-95' : ''}
                      `}>
                        {isChangingStatus === user.id ? (
                          <span className="flex items-center gap-1.5">
                            <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full"></div>
                            <span>Изменение...</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                            {user.is_active ? 'Активен' : 'Отключен'}
                          </span>
                        )}
                      </div>
                    </button>
                  </TableCell>

                  {/* Действия */}
                  <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    <div className="flex gap-2">
                      {deleteConfirm === user.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="flex items-center justify-center w-8 h-8 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                            title="Подтвердить удаление"
                          >
                            <svg 
                              className="w-4 h-4" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="flex items-center justify-center w-8 h-8 text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                            title="Отменить"
                          >
                            <svg 
                              className="w-4 h-4" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Кнопка редактирования */}
                          <button
                            onClick={() => handleEdit(user)}
                            className="flex items-center justify-center w-8 h-8 text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 transition-colors"
                            title="Редактировать пользователя"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          {/* Кнопка удаления */}
                          <button
                            onClick={() => setDeleteConfirm(user.id)}
                            className="flex items-center justify-center w-8 h-8 text-red-600 bg-red-100 rounded-lg hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 transition-colors"
                            title="Удалить пользователя"
                          >
                            <TrashBinIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Пользователи не найдены
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно редактирования */}
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        roles={roles}
        positions={positions}
        onSave={handleSaveUser}
        isLoading={isUpdating}
      />
    </>
  );
}