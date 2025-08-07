import { useState } from 'react';
import { PendingUser, useApproveUserMutation, useDeletePendingUserMutation } from '../../store/api/usersManagementApi';
import { Role, Position } from '../../store/api/userApi';
import { CheckCircleIcon, CloseIcon } from '../../icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";

interface PendingUsersTableProps {
  users: PendingUser[];
  isLoading: boolean;
  roles: Role[];
  positions: Position[];
}

export default function PendingUsersTable({ users, isLoading, roles, positions }: PendingUsersTableProps) {
  const [approveUser] = useApproveUserMutation();
  const [deletePendingUser] = useDeletePendingUserMutation();
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await approveUser(id).unwrap();
    } catch (error) {
      console.error('Ошибка при одобрении пользователя:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading(id);
    try {
      await deletePendingUser(id).unwrap();
    } catch (error) {
      console.error('Ошибка при отклонении заявки:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleName = (user: PendingUser) => {
    if (user.role?.name) return user.role.name;
    if (user.role_id) {
      const role = roles.find(r => r.id === user.role_id);
      return role?.name || 'Не указано';
    }
    return 'Не указано';
  };


  const getPositionName = (user: PendingUser) => {
    if (user.position?.name) return user.position.name;
    if (user.position_id) {
      const position = positions.find(p => p.id === user.position_id);
      return position?.name || 'Не указано';
    }
    return 'Не указано';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table>
          {/* Table Header */}
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Заявитель
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Контакты
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Роль
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Должность
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Дата подачи
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Действия
              </TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {users.map((user) => (
              <TableRow key={user.id}>
                {/* Заявитель */}
                <TableCell className="px-5 py-4 sm:px-6 text-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 overflow-hidden rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                      <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                        {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {user.full_name}
                      </span>
                      <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                        ID: {user.id}
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

                {/* Должность - используем helper функцию */}
                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  {getPositionName(user)}
                </TableCell>

                {/* Дата подачи */}
                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  <Badge size="sm" color="warning">
                    {new Date(user.created_at).toLocaleDateString('ru-RU')}
                  </Badge>
                </TableCell>

                {/* Действия */}
                <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(user.id)}
                      disabled={actionLoading === user.id}
                      className="flex items-center justify-center w-8 h-8 text-green-600 bg-green-100 rounded-lg hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 dark:text-green-400 disabled:opacity-50 transition-colors"
                      title="Одобрить заявку"
                    >
                      {actionLoading === user.id ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <CheckCircleIcon className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleReject(user.id)}
                      disabled={actionLoading === user.id}
                      className="flex items-center justify-center w-8 h-8 text-red-600 bg-red-100 rounded-lg hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 disabled:opacity-50 transition-colors"
                      title="Отклонить заявку"
                    >
                      {actionLoading === user.id ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <CloseIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Запросы на регистрацию не найдены
          </div>
        )}
      </div>
    </div>
  );
}