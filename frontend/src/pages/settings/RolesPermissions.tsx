import React, { useMemo, useState } from 'react';
import { getApiErrorMessage } from '../../types/apiError';
import { asApiError } from '../../types/apiError';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import Button from '../../components/ui/button/Button';
import DeleteConfirmModal from '../../components/ui/DeleteConfirmModal';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import { useGetAllUsersQuery } from '../../store/api/usersManagementApi';
import {
  Permission,
  RbacRole,
  useAssignRoleToUserMutation,
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useGetPermissionsQuery,
  useGetRolesQuery,
  useGetRoleUsersQuery,
  useUnassignRoleFromUserMutation,
  useUpdateRoleMutation,
} from '../../store/api/rbacApi';

const RESOURCE_LABELS: Record<string, string> = {
  products: 'Товары',
  stock: 'Склад и остатки',
  cashflow: 'Финансы (касса)',
  supplies: 'Поставки',
  orders: 'Заказы',
  users: 'Пользователи',
  payroll: 'Зарплата',
  reports: 'Отчёты',
  customers: 'Клиенты',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Создание',
  read: 'Просмотр',
  update: 'Изменение',
  delete: 'Удаление',
  approve: 'Подтверждение',
  invite: 'Приглашение',
  manage_roles: 'Управление ролями',
  export: 'Экспорт',
};

const resourceLabel = (resource: string) => RESOURCE_LABELS[resource] || resource;
const actionLabel = (action: string) => ACTION_LABELS[action] || action;

const groupByResource = (permissions: Permission[]) => {
  const groups: Record<string, Permission[]> = {};
  for (const perm of permissions) {
    if (!groups[perm.resource]) groups[perm.resource] = [];
    groups[perm.resource].push(perm);
  }
  return groups;
};

const PermissionMatrix: React.FC<{
  permissions: Permission[];
  selected: Set<string>;
  onToggle: (code: string) => void;
  onToggleResource: (codes: string[], checked: boolean) => void;
  disabled?: boolean;
}> = ({ permissions, selected, onToggle, onToggleResource, disabled }) => {
  const groups = useMemo(() => groupByResource(permissions), [permissions]);

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([resource, perms]) => {
        const codes = perms.map((p) => p.code);
        const allChecked = codes.every((c) => selected.has(c));
        const someChecked = codes.some((c) => selected.has(c));

        return (
          <div key={resource} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <label className="flex items-center gap-2 mb-2 font-medium text-sm text-gray-800 dark:text-white/90">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = !allChecked && someChecked;
                }}
                onChange={(e) => onToggleResource(codes, e.target.checked)}
                disabled={disabled}
              />
              {resourceLabel(resource)}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-6">
              {perms.map((perm) => (
                <label key={perm.code} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={selected.has(perm.code)}
                    onChange={() => onToggle(perm.code)}
                    disabled={disabled}
                  />
                  {actionLabel(perm.action)}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const RoleEditorModal: React.FC<{
  role: RbacRole | null;
  permissions: Permission[];
  onClose: () => void;
}> = ({ role, permissions, onClose }) => {
  const isCreate = role === null;
  const [name, setName] = useState(role?.name || '');
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permission_codes || []));
  const [newUserId, setNewUserId] = useState<string>('');

  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();
  const [deleteRole, { isLoading: isDeleting }] = useDeleteRoleMutation();
  const [assignRole, { isLoading: isAssigning }] = useAssignRoleToUserMutation();
  const [unassignRole] = useUnassignRoleFromUserMutation();

  const { data: roleUsers = [] } = useGetRoleUsersQuery(role?.id ?? 0, { skip: isCreate });
  const { data: allUsers = [] } = useGetAllUsersQuery(undefined, { skip: isCreate });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleResource = (codes: string[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      codes.forEach((c) => (checked ? next.add(c) : next.delete(c)));
      return next;
    });
  };

  const handleSave = async () => {
    setError(null);
    try {
      if (isCreate) {
        await createRole({ name, permission_codes: Array.from(selected) }).unwrap();
      } else {
        await updateRole({
          id: role.id,
          data: { name: role.is_system ? undefined : name, permission_codes: Array.from(selected) },
        }).unwrap();
      }
      onClose();
    } catch (rawE) {
      const e = asApiError(rawE);
      setError(getApiErrorMessage(e, 'Не удалось сохранить роль'));
    }
  };

  const handleDelete = async () => {
    if (!role) return;
    try {
      await deleteRole(role.id).unwrap();
      setConfirmDelete(false);
      onClose();
    } catch (rawE) {
      const e = asApiError(rawE);
      setError(getApiErrorMessage(e, 'Не удалось удалить роль'));
    }
  };

  const availableUsers = allUsers.filter((u) => !roleUsers.some((ru) => ru.id === u.id));

  const handleAddUser = async () => {
    if (!role || !newUserId) return;
    try {
      await assignRole({ roleId: role.id, userId: Number(newUserId) }).unwrap();
      setNewUserId('');
    } catch (rawE) {
      const e = asApiError(rawE);
      setError(getApiErrorMessage(e, 'Не удалось назначить роль'));
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl shadow-2xl my-8">
          <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
            {isCreate ? 'Создать роль' : `Роль: ${role.name}`}
            {!isCreate && role.is_system && (
              <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                системная
              </span>
            )}
          </h3>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Название роли
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isCreate && role.is_system}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
              placeholder="Например: Кассир"
            />
            {!isCreate && role.is_system && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Системные роли (Admin/Manager/Staff) переименовать нельзя — можно только изменить набор прав.
              </p>
            )}
          </div>

          <div className="mb-4 max-h-80 overflow-y-auto pr-1">
            <PermissionMatrix
              permissions={permissions}
              selected={selected}
              onToggle={toggle}
              onToggleResource={toggleResource}
            />
          </div>

          {!isCreate && !role.is_system && (
            <div className="mb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-800 dark:text-white/90 mb-2">
                Сотрудники с этой ролью
              </h4>
              <div className="space-y-1 mb-3">
                {roleUsers.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Роль никому не назначена</p>
                )}
                {roleUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-900 rounded px-3 py-1.5">
                    <span className="text-gray-700 dark:text-gray-300">{u.full_name || u.email}</span>
                    <button
                      className="text-red-600 hover:text-red-700 text-xs"
                      onClick={() => unassignRole({ roleId: role.id, userId: u.id })}
                    >
                      Снять
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <select
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Выберите сотрудника...</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="outline" onClick={handleAddUser} disabled={!newUserId || isAssigning}>
                  Назначить
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {!isCreate && !role.is_system && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
                disabled={isDeleting}
              >
                Удалить роль
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="button" onClick={handleSave} disabled={isCreating || isUpdating || !name.trim()}>
              {isCreating || isUpdating ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </div>

      {!isCreate && (
        <DeleteConfirmModal
          title="Удалить роль?"
          itemName={role.name}
          isOpen={confirmDelete}
          isLoading={isDeleting}
          onClose={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};

const RolesPermissions: React.FC = () => {
  const { isAdmin } = useRoleAccess();
  const { data: roles = [], isLoading: rolesLoading } = useGetRolesQuery();
  const { data: permissions = [], isLoading: permsLoading } = useGetPermissionsQuery();
  const [editingRole, setEditingRole] = useState<RbacRole | null | undefined>(undefined);

  if (!isAdmin) {
    return (
      <div className="p-6">
        <PageBreadcrumb pageTitle="Роли и права" />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Доступ есть только у администраторов.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageBreadcrumb pageTitle="Роли и права" />

      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
          Системные роли (Admin / Manager / Staff) определяют базовый доступ сотрудника. Кастомные роли можно
          назначать сотрудникам дополнительно, чтобы точечно выдать им конкретные права.
        </p>
        <Button onClick={() => setEditingRole(null)}>Создать роль</Button>
      </div>

      {(rolesLoading || permsLoading) ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setEditingRole(role)}
              className="text-left rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-700"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-800 dark:text-white/90">{role.name}</span>
                {role.is_system && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    системная
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {role.permission_codes.length} прав · {role.user_count} сотрудник(ов)
              </p>
            </button>
          ))}
        </div>
      )}

      {editingRole !== undefined && (
        <RoleEditorModal
          role={editingRole}
          permissions={permissions}
          onClose={() => setEditingRole(undefined)}
        />
      )}
    </div>
  );
};

export default RolesPermissions;
