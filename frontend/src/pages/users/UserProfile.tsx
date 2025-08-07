import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useGetUserByIdQuery, useUpdateUserMutation } from '../../store/api/usersManagementApi';
import { useGetPositionsQuery } from '../../store/api/positionsApi';
import { useGetRolesQuery } from '../../store/api/rolesPositionsApi';
import Button from '../../components/ui/button/Button';
import Label from '../../components/form/Label';
import UserStatsMetrics from '../../components/users/UserStatsMetrics';

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'stats'>('profile');

  const userId = id ? parseInt(id) : undefined;
  
  const { data: user, isLoading, error, refetch } = useGetUserByIdQuery(userId!, {
    skip: !userId
  });
  
  const { data: positions = [] } = useGetPositionsQuery();
  const { data: roles = [] } = useGetRolesQuery();
  
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    position_id: null as number | null,
    role_id: null as number | null,
    is_active: true,
  });

  // Обновляем форму при загрузке данных пользователя
  const updateFormData = useCallback(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        position_id: user.position?.id || user.position_id || null,
        role_id: user.role?.id || user.role_id || null,
        is_active: user.is_active ?? true,
      });
    }
  }, [user]);

  // Обновляем данные формы при изменении пользователя
  React.useEffect(() => {
    updateFormData();
  }, [updateFormData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!userId) return;

    try {
      await updateUser({
        id: userId,
        data: {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          position_id: formData.position_id || undefined,
          role_id: formData.role_id || undefined,
          is_active: formData.is_active,
        }
      }).unwrap();
      
      setIsEditing(false);
      refetch();
    } catch (error) {
      console.error('Ошибка при обновлении пользователя:', error);
    }
  };

  const handleCancel = () => {
    updateFormData();
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Пользователь не найден
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Запрашиваемый пользователь не существует или удален
            </p>
            <Button onClick={() => navigate('/users')}>
              Вернуться к списку
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Профиль пользователя
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {user.full_name}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              Редактировать
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Отмена
              </Button>
              <Button onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Табы */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
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
              Статистика сотрудника
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'profile' ? (
            /* Содержимое профиля */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Основная информация */}
                <div>
                  <Label>Полное имя</Label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 disabled:dark:bg-gray-800 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 disabled:dark:bg-gray-800 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label>Телефон</Label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 disabled:dark:bg-gray-800 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label>Должность</Label>
                  <select
                    value={formData.position_id || ''}
                    onChange={(e) => handleInputChange('position_id', e.target.value ? parseInt(e.target.value) : null)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 disabled:dark:bg-gray-800 disabled:cursor-not-allowed"
                  >
                    <option value="">Не выбрано</option>
                    {positions.map(position => (
                      <option key={position.id} value={position.id}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Роль</Label>
                  <select
                    value={formData.role_id || ''}
                    onChange={(e) => handleInputChange('role_id', e.target.value ? parseInt(e.target.value) : null)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 disabled:dark:bg-gray-800 disabled:cursor-not-allowed"
                  >
                    <option value="">Не выбрано</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    disabled={!isEditing}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
                  />
                  <Label htmlFor="is_active" className="ml-2">
                    Активный пользователь
                  </Label>
                </div>
              </div>

              {/* Информация о датах */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Системная информация
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Дата создания:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {user.created_at ? new Date(user.created_at).toLocaleString('ru-RU') : 'Не указана'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Последнее обновление:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {user.updated_at ? new Date(user.updated_at).toLocaleString('ru-RU') : 'Не указана'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ✅ ИСПРАВЛЯЕМ: Передаем userId в статистику */
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                Статистика продаж сотрудника: {user.full_name}
              </h3>
              <UserStatsMetrics userId={userId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}