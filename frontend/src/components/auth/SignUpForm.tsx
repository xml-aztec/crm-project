import { useState, ChangeEvent, FormEvent, useCallback } from "react";
import { Link } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import { useRegisterMutation } from "../../store/api/authApi";

// Структуры данных и константы без изменений
interface FormData {
  full_name: string;
  email: string;
  password: string;
  phone: string;
}

interface ValidationErrors {
  full_name?: string;
  email?: string;
  password?: string;
  phone?: string;
  terms?: string;
  general?: string;
}

// Обновлено регулярное выражение для кыргызских номеров
const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 6,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  NAME_REGEX: /^[a-zA-Zа-яА-Я\s]+$/,
  // Регулярное выражение для кыргызских номеров: +996 и 9 цифр после
  PHONE_REGEX: /^(\+996|0)[0-9]{9}$/ 
} as const;

const ERROR_MESSAGES = {
  REQUIRED: 'Это поле обязательно для заполнения',
  EMAIL_INVALID: 'Введите корректный email адрес',
  PASSWORD_TOO_SHORT: `Пароль должен содержать минимум ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} символов`,
  NAME_INVALID: 'ФИО может содержать только буквы и пробелы',
  // Обновленное сообщение об ошибке для телефона
  PHONE_INVALID: 'Введите номер в формате +996 XXX XXX XXX',
  TERMS_NOT_ACCEPTED: 'Необходимо согласиться с условиями использования'
} as const;

export default function SignUpForm() {
  // Хуки и состояния (без изменений)
  const [register, { isLoading: isSubmitting, isSuccess }] = useRegisterMutation();

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [formData, setFormData] = useState<FormData>({
    full_name: "",
    email: "",
    password: "",
    phone: "",
  });

  // Функции обработчиков без изменений (handleChange, validateField, validateForm, isFormValid)
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  }, [errors]);

  // Валидация отдельного поля
  const validateField = useCallback((fieldName: keyof FormData, value: string | number): string | undefined => {
    switch (fieldName) {
      case 'full_name':
        if (!value) return ERROR_MESSAGES.REQUIRED;
        if (typeof value === 'string' && !VALIDATION_RULES.NAME_REGEX.test(value.trim())) 
          return ERROR_MESSAGES.NAME_INVALID;
        break;
      
      case 'email':
        if (!value) return ERROR_MESSAGES.REQUIRED;
        if (typeof value === 'string' && !VALIDATION_RULES.EMAIL_REGEX.test(value.trim())) 
          return ERROR_MESSAGES.EMAIL_INVALID;
        break;
      
      case 'password':
        if (!value) return ERROR_MESSAGES.REQUIRED;
        if (typeof value === 'string' && value.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) 
          return ERROR_MESSAGES.PASSWORD_TOO_SHORT;
        break;
      
      case 'phone':
        if (!value) return ERROR_MESSAGES.REQUIRED;
        if (typeof value === 'string' && !VALIDATION_RULES.PHONE_REGEX.test(value.trim()))
          return ERROR_MESSAGES.PHONE_INVALID;
        break;
    }
    return undefined;
  }, []);

  // Валидация всей формы
  const validateForm = useCallback((): ValidationErrors => {
    const newErrors: ValidationErrors = {};
    
    (Object.keys(formData) as Array<keyof FormData>).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    // Проверяем согласие с условиями
    if (!isChecked) {
      newErrors.terms = ERROR_MESSAGES.TERMS_NOT_ACCEPTED;
    }

    return newErrors;
  }, [formData, isChecked, validateField]);

  // Проверка валидности формы для активации кнопки
  const isFormValid = useCallback((): boolean => {
    const errors = validateForm();
    return Object.keys(errors).length === 0;
  }, [validateForm]);

  // Обработчик отправки формы
  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Валидируем все поля
    const formErrors = validateForm();
    
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      
      // Фокусируемся на первом поле с ошибкой
      const firstErrorField = Object.keys(formErrors)[0];
      const element = document.getElementById(firstErrorField);
      element?.focus();
      return;
    }

    setErrors({});
    
    try {
      // Роль назначается сервером при регистрации (всегда "manager") — клиент её не выбирает
      await register(formData).unwrap();
    } catch (error: any) {
      // Обрабатываем ошибки API
      console.error("Ошибка регистрации:", error);
      
      if (error.data?.detail === 'Email already registered') {
        setErrors({ email: 'Этот email уже зарегистрирован' });
      } else if (error.data?.errors) {
        // Преобразуем ошибки API в формат ошибок формы
        const apiErrors: ValidationErrors = {};
        Object.entries(error.data.errors).forEach(([field, message]) => {
          const key = field as keyof ValidationErrors;
          apiErrors[key] = Array.isArray(message) ? message[0] : message as string;
        });
        setErrors(apiErrors);
      } else {
        setErrors({ general: 'Произошла ошибка при регистрации. Попробуйте еще раз.' });
      }
    }
  }, [formData, validateForm, register]);

  // Если форма успешно отправлена, показываем экран успеха
  if (isSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-white dark:bg-gray-900">
        <div className="w-full max-w-md mx-auto px-4">
          <div className="text-center mb-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
              <svg 
                className="h-8 w-8 text-green-500 dark:text-green-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90 mb-2">
              Заявка отправлена на модерацию
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Администратор рассмотрит вашу заявку и предоставит доступ к CRM-системе.
              <br/>
              Уведомление придет на указанный email.
            </p>
            <Link 
              to="/signin" 
              className="inline-block rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Вернуться на страницу входа
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Основная форма регистрации - минималистичный стиль
  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-white dark:bg-gray-900">
      <div className="w-full max-w-md mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Регистрация в системе
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Заполните форму для создания учетной записи
          </p>
        </div>
        
        <div>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Общая ошибка */}
              {errors.general && (
                <div className="p-3 text-sm text-error-500 bg-error-50 border border-error-200 rounded-lg dark:bg-error-900/20 dark:border-error-800">
                  {errors.general}
                </div>
              )}
              
              {/* ФИО */}
              <div>
                <Label>
                  ФИО <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Введите ваше полное имя"
                  error={!!errors.full_name}
                  hint={errors.full_name}
                  disabled={isSubmitting}
                />
              </div>
              
              {/* Email */}
              <div>
                <Label>
                  Email <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Введите ваш email"
                  error={!!errors.email}
                  hint={errors.email}
                  disabled={isSubmitting}
                />
              </div>
              
              {/* Телефон */}
              <div>
                <Label>
                  Телефон <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+996 XXX XXX XXX" // Обновлен плейсхолдер для Кыргызстана
                  error={!!errors.phone}
                  hint={errors.phone}
                  disabled={isSubmitting}
                />
              </div>
              
              {/* Пароль */}
              <div>
                <Label>
                  Пароль <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Введите пароль"
                    error={!!errors.password}
                    hint={errors.password}
                    disabled={isSubmitting}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2 ${
                      isSubmitting ? 'pointer-events-none opacity-50' : ''
                    }`}
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    )}
                  </span>
                </div>
              </div>
              
              {/* Краткая заметка о роли и должности */}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">Примечание:</span> При регистрации вам будет автоматически назначена роль "Менеджер". Должность администратор укажет при одобрении заявки.
              </div>
              
              {/* Согласие с правилами */}
              <div className="flex items-center gap-3">
                <Checkbox
                  id="terms"
                  checked={isChecked}
                  onChange={() => setIsChecked(!isChecked)}
                  label=""
                  disabled={isSubmitting}
                />
                <div>
                  <p className="text-sm font-normal text-gray-600 dark:text-gray-400">
                    Создавая аккаунт, вы соглашаетесь с{" "}
                    <Link to="/terms" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
                      Условиями использования
                    </Link>{" "}
                    и{" "}
                    <Link to="/privacy" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
                      Политикой конфиденциальности
                    </Link>
                  </p>
                  {errors.terms && (
                    <p className="mt-1 text-xs text-error-500">{errors.terms}</p>
                  )}
                </div>
              </div>
              
              {/* Кнопка регистрации - скрытый submit для работы с формой */}
              <button type="submit" style={{ display: 'none' }}></button>
            </div>
          </form>

          {/* Кнопка регистрации вне формы */}
          <div className="mt-6">
            <Button
              className="w-full"
              size="sm"
              onClick={() => {
                const form = document.querySelector('form');
                if (form) form.requestSubmit();
              }}
              disabled={isSubmitting || !isFormValid()}
            >
              {isSubmitting ? "Отправка..." : "Зарегистрироваться"}
            </Button>
          </div>

          <div className="mt-5 text-center">
            <p className="text-sm font-normal text-gray-700 dark:text-gray-400">
              Уже есть аккаунт? {" "}
              <Link
                to="/signin"
                className={`text-brand-500 hover:text-brand-600 dark:text-brand-400 ${
                  isSubmitting ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}