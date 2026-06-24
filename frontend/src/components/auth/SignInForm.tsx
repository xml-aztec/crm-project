import { useState, ChangeEvent, FormEvent, useCallback, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { clearError, loginUser, fetchCurrentUser } from "../../store/slices/authSlice";

interface FormData {
  email: string;
  password: string;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  general?: string;
}

// Константы для валидации
const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 6
} as const;

// Сообщения об ошибках
const ERROR_MESSAGES = {
  EMAIL_REQUIRED: 'Email обязателен для заполнения',
  EMAIL_INVALID: 'Введите корректный email адрес',
  PASSWORD_REQUIRED: 'Пароль обязателен для заполнения',
  PASSWORD_TOO_SHORT: `Пароль должен содержать минимум ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} символов`,
} as const;

export default function SignInForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = (location.state as { message?: string } | null)?.message;

  // Redux состояния и actions
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated } = useAppSelector((state) => state.auth);
  
  // Локальное состояние формы
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: ""
  });

  // Редирект после успешной авторизации
  useEffect(() => {
    if (isAuthenticated) {
      // Проверяем, есть ли сохраненный URL для редиректа
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      
      if (redirectPath && redirectPath !== '/signin') {
        localStorage.removeItem('redirectAfterLogin');
        navigate(redirectPath, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, navigate]);
  
  // Очистка ошибок при размонтировании
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Обработчик изменений с очисткой ошибок
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Очищаем ошибку для этого поля при изменении
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
        general: undefined
      }));
    }
    
    // Также очищаем ошибку Redux при изменении полей
    if (error) {
      dispatch(clearError());
    }
  }, [errors, error, dispatch]);

  // Функция валидации поля
  const validateField = useCallback((fieldName: keyof FormData, value: string): string | undefined => {
    switch (fieldName) {
      case 'email':
        if (!value.trim()) return ERROR_MESSAGES.EMAIL_REQUIRED;
        if (!VALIDATION_RULES.EMAIL_REGEX.test(value.trim())) return ERROR_MESSAGES.EMAIL_INVALID;
        break;
      
      case 'password':
        if (!value.trim()) return ERROR_MESSAGES.PASSWORD_REQUIRED;
        if (value.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) return ERROR_MESSAGES.PASSWORD_TOO_SHORT;
        break;
    }
    return undefined;
  }, []);

  // Валидация всех полей
  const validateForm = useCallback((): ValidationErrors => {
    const newErrors: ValidationErrors = {};
    
    (Object.keys(formData) as Array<keyof FormData>).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    return newErrors;
  }, [formData, validateField]);

  // Проверка валидности формы
  const isFormValid = useCallback((): boolean => {
    const errors = validateForm();
    return Object.keys(errors).length === 0;
  }, [validateForm]);

  // Функция для безопасного извлечения сообщения об ошибке
  const getErrorMessage = (error: any): string => {
    if (!error) return '';
    
    // Если это строка - возвращаем как есть
    if (typeof error === 'string') return error;
    
    // Если это объект с message - извлекаем message
    if (typeof error === 'object' && error.message) {
      return error.message;
    }
    
    // Если это объект с data.message - извлекаем из data
    if (typeof error === 'object' && error.data?.message) {
      return error.data.message;
    }
    
    // Если это объект с data.detail - извлекаем из detail
    if (typeof error === 'object' && error.data?.detail) {
      return error.data.detail;
    }
    
    // Возвращаем общее сообщение
    return 'Произошла ошибка при входе в систему';
  };

  // Обработчик отправки формы
  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Валидация формы
    const formErrors = validateForm();
    
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      
      // Фокус на первом поле с ошибкой
      const firstErrorField = Object.keys(formErrors)[0];
      const element = document.getElementById(firstErrorField);
      element?.focus();
      return;
    }

    setErrors({});
    
    try {
      // Выполняем вход
      await dispatch(loginUser({ 
        email: formData.email, 
        password: formData.password
      })).unwrap();
      
      // После успешного входа загружаем данные пользователя
      await dispatch(fetchCurrentUser()).unwrap();
      
      // Сохраняем флаг "запомнить меня" (опционально)
      if (isChecked) {
        localStorage.setItem('rememberMe', 'true');
      }
      
    } catch (error) {
      // Ошибка уже обработана в slice
    }
  }, [formData, validateForm, dispatch, isChecked]);

  // Обработчик изменения чекбокса
  const handleCheckboxChange = useCallback((checked: boolean) => {
    setIsChecked(checked);
  }, []);

  // Обработчик клика по кнопке входа
  const handleLoginClick = useCallback(() => {
    const form = document.querySelector('form') as HTMLFormElement;
    if (form) {
      form.requestSubmit();
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-white dark:bg-gray-900">
      <div className="w-full max-w-md mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Вход в систему
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Введите ваш email и пароль для входа
          </p>
        </div>
        
        <div>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Сообщение после редиректа (например, после успешного сброса пароля) */}
              {successMessage && (
                <div className="p-3 text-sm text-success-600 bg-success-50 border border-success-200 rounded-lg dark:bg-success-900/20 dark:border-success-800">
                  {successMessage}
                </div>
              )}

              {/* Ошибка от Redux */}
              {error && (
                <div className="p-3 text-sm text-error-500 bg-error-50 border border-error-200 rounded-lg dark:bg-error-900/20 dark:border-error-800">
                  {getErrorMessage(error)}
                </div>
              )}
              
              {/* Ошибки валидации */}
              {errors.general && (
                <div className="p-3 text-sm text-error-500 bg-error-50 border border-error-200 rounded-lg dark:bg-error-900/20 dark:border-error-800">
                  {errors.general}
                </div>
              )}
              
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
                  disabled={loading}
                />
              </div>
              
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
                    placeholder="Введите ваш пароль"
                    error={!!errors.password}
                    hint={errors.password}
                    disabled={loading}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2 ${
                      loading ? 'pointer-events-none opacity-50' : ''
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
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="rememberMe"
                    checked={isChecked}
                    onChange={handleCheckboxChange}
                    disabled={loading}
                    label=""
                  />
                  <label
                    htmlFor="rememberMe"
                    className={`block font-normal text-gray-700 text-sm dark:text-gray-400 ${
                      loading ? 'opacity-50' : 'cursor-pointer'
                    }`}
                  >
                    Запомнить меня
                  </label>
                </div>
                <Link
                  to="/forgot-password"
                  className={`text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 ${
                    loading ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  Забыли пароль?
                </Link>
              </div>
              
              {/* Скрытая кнопка submit для корректной работы формы */}
              <button type="submit" style={{ display: 'none' }}>Submit</button>
            </div>
          </form>

          {/* Кнопка входа вне формы */}
          <div className="mt-6">
            <Button
              className="w-full"
              size="sm"
              onClick={handleLoginClick}
              disabled={loading || !isFormValid()}
            >
              {loading ? "Выполняется вход..." : "Войти"}
            </Button>
          </div>

          <div className="mt-5 text-center">
            <p className="text-sm font-normal text-gray-700 dark:text-gray-400">
              Нет аккаунта? {""}
              <Link
                to="/signup"
                className={`text-brand-500 hover:text-brand-600 dark:text-brand-400 ${
                  loading ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}