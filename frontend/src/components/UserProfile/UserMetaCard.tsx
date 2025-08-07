import { useState, useEffect } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { useGetCurrentUserQuery, useUpdateCurrentUserMutation } from "../../store/api/userApi";
import { useGetRolesQuery, useGetPositionsQuery } from "../../store/api/rolesPositionsApi";
import { useNavigate } from "react-router";

export default function UserMetaCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const navigate = useNavigate();
  
  // Получение данных пользователя
  const { data: currentUser, isLoading: userLoading, error } = useGetCurrentUserQuery();
  
  // Мутация для обновления пользователя
  const [updateUser, { isLoading: isUpdating }] = useUpdateCurrentUserMutation();
  
  // Получение списков ролей и должностей
  const { data: roles = [] } = useGetRolesQuery();
  const { data: positions = [] } = useGetPositionsQuery();

  // Находим названия роли и должности по ID
  const roleName = currentUser?.role?.name || 
    (currentUser?.role_id ? roles.find(r => r.id === currentUser.role_id)?.name : null) || 
    "Пользователь";
    
  const positionName = currentUser?.position?.name || 
    (currentUser?.position_id ? positions.find(p => p.id === currentUser.position_id)?.name : null) || 
    "Не указана должность";

  // Локальное состояние формы
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
  });

  // ИСПРАВЛЕНО: используем useEffect вместо useState
  useEffect(() => {
    if (currentUser) {
      setFormData({
        full_name: currentUser.full_name || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
      });
    }
  }, [currentUser]);

  // Обработчик изменения полей формы
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Сохранение изменений
  const handleSave = async () => {
    try {
      await updateUser(formData).unwrap();
      closeModal();
    } catch (error) {
      // Обработка ошибки без алерта
    }
  };

  // Показываем лоадер пока данные загружаются
  if (userLoading) {
    return (
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  // Обработка ошибки
  if (error) {
    const errorStatus = (error as any).status;
    
    // Если ошибка авторизации - редирект на логин
    if (errorStatus === 401) {
      navigate('/signin');
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
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800">
              {/* Аватар (заглушка или инициал) */}
              <div className="flex items-center justify-center h-full w-full bg-brand-500 text-white">
                {currentUser?.full_name 
                  ? currentUser.full_name.charAt(0).toUpperCase() 
                  : currentUser?.email?.charAt(0).toUpperCase() || "?"}
              </div>
            </div>
            <div className="order-3 xl:order-2">
              <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                {currentUser?.full_name || currentUser?.email || "Пользователь"}
              </h4>
              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {roleName}
                </p>
                <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {positionName}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={openModal}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            <svg
              className="fill-current"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                fill=""
              />
            </svg>
            Редактировать
          </button>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Редактирование профиля
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Обновите ваши личные данные
            </p>
          </div>
          <form className="flex flex-col" onSubmit={(e) => e.preventDefault()}>
            <div className="custom-scrollbar overflow-y-auto px-2 pb-3">
              <div>
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Личная информация
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2">
                    <Label>ФИО</Label>
                    <Input 
                      type="text" 
                      name="full_name"
                      value={formData.full_name} 
                      onChange={handleChange}
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Email</Label>
                    <Input 
                      type="email" 
                      name="email"
                      value={formData.email} 
                      onChange={handleChange}
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Телефон</Label>
                    <Input 
                      type="tel" 
                      name="phone"
                      value={formData.phone} 
                      onChange={handleChange}
                      placeholder="+996 XXX XXX XXX"
                      disabled={isUpdating}
                    />
                  </div>

                  {/* Должность и роль - только для отображения */}
                  <div className="col-span-2 lg:col-span-1">
                    <Label>Должность</Label>
                    <Input 
                      type="text" 
                      value={positionName} 
                      disabled={true}
                      hint="Должность можно изменить только через администратора"
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Роль</Label>
                    <Input 
                      type="text" 
                      value={roleName} 
                      disabled={true}
                      hint="Роль может изменить только администратор"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal} disabled={isUpdating}>
                Отмена
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave} 
                disabled={isUpdating}
              >
                {isUpdating ? (
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
    </>
  );
}