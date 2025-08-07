import { useState, useEffect } from 'react';
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { UserRead } from '../../store/api/userApi';
import { Role, Position } from '../../store/api/userApi';
import { AdminUpdateUserRequest } from '../../store/api/usersManagementApi';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserRead | null;
  roles: Role[];
  positions: Position[];
  onSave: (userId: number, userData: AdminUpdateUserRequest) => Promise<void>;
  isLoading: boolean;
}

export default function EditUserModal({ 
  isOpen, 
  onClose, 
  user, 
  roles, 
  positions, 
  onSave, 
  isLoading = false 
}: EditUserModalProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role_id: 0,
    position_id: 0,
    salary_base: '' // Изменяем на строку для лучшего контроля ввода
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        role_id: user.role_id || user.role?.id || 0,
        position_id: user.position_id || user.position?.id || 0,
        salary_base: user.salary_base ? user.salary_base.toString() : '' // Преобразуем в строку, пустая строка если 0 или undefined
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'salary_base') {
      // Для зарплаты разрешаем только числа и пустую строку
      if (value === '' || /^\d+$/.test(value)) {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'role_id' || name === 'position_id' 
          ? parseInt(value) || 0 
          : value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      // Подготавливаем данные для отправки
      const submitData: AdminUpdateUserRequest = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        role_id: formData.role_id || undefined,
        position_id: formData.position_id || undefined,
        salary_base: formData.salary_base ? parseInt(formData.salary_base) : 0 // Преобразуем строку в число или 0
      };
      
      await onSave(user.id, submitData);
    }
  };

  const handleClose = () => {
    onClose();
    // Сбрасываем форму при закрытии
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
        role_id: user.role_id || user.role?.id || 0,
        position_id: user.position_id || user.position?.id || 0,
        salary_base: user.salary_base ? user.salary_base.toString() : ''
      });
    }
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-[700px] m-4">
      <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Редактирование пользователя
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            Изменение данных пользователя {user.full_name}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="custom-scrollbar overflow-y-auto px-2 pb-3">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-2">
              {/* ФИО */}
              <div className="col-span-2 lg:col-span-1">
                <Label>ФИО</Label>
                <Input 
                  type="text" 
                  name="full_name"
                  value={formData.full_name} 
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>

              {/* Email */}
              <div className="col-span-2 lg:col-span-1">
                <Label>Email</Label>
                <Input 
                  type="email" 
                  name="email"
                  value={formData.email} 
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>

              {/* Телефон */}
              <div className="col-span-2 lg:col-span-1">
                <Label>Телефон</Label>
                <Input 
                  type="tel" 
                  name="phone"
                  value={formData.phone} 
                  onChange={handleChange}
                  placeholder="+996 XXX XXX XXX"
                  disabled={isLoading}
                />
              </div>

              {/* Роль */}
              <div className="col-span-2 lg:col-span-1">
                <Label>Роль</Label>
                <select
                  name="role_id"
                  value={formData.role_id}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
                >
                  <option value={0}>Выберите роль</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>

              {/* Должность */}
              <div className="col-span-2 lg:col-span-1">
                <Label>Должность</Label>
                <select
                  name="position_id"
                  value={formData.position_id}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
                >
                  <option value={0}>Выберите должность</option>
                  {positions.map(position => (
                    <option key={position.id} value={position.id}>{position.name}</option>
                  ))}
                </select>
              </div>

              {/* Базовая зарплата */}
              <div className="col-span-2 lg:col-span-1">
                <Label>Базовая зарплата (сом)</Label>
                <Input 
                  type="text" // Изменяем на text для лучшего контроля
                  name="salary_base"
                  value={formData.salary_base} 
                  onChange={handleChange}
                  placeholder="Введите сумму"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Оставьте пустым если зарплата не установлена
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <Button size="sm" variant="outline" onClick={handleClose} disabled={isLoading}>
              Отмена
            </Button>
            <Button 
              size="sm" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 border-2 border-t-brand-200 border-r-brand-200 border-b-brand-500 border-l-brand-500 rounded-full animate-spin"></span>
                  Сохранение...
                </>
              ) : "Сохранить изменения"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}