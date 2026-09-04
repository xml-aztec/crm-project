import { useState, ChangeEvent, FormEvent, useCallback } from "react";
import { asApiError, getApiErrorMessage } from '../../types/apiError';
import { useNavigate, useSearchParams, Link } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { useResetPasswordMutation } from "../../store/api/authApi";

interface FormData {
  password: string;
  confirmPassword: string;
}

interface ValidationErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const PASSWORD_MIN_LENGTH = 8;

const ERROR_MESSAGES = {
  PASSWORD_REQUIRED: 'Пароль обязателен для заполнения',
  PASSWORD_TOO_SHORT: `Пароль должен содержать минимум ${PASSWORD_MIN_LENGTH} символов`,
  CONFIRM_REQUIRED: 'Подтвердите пароль',
  PASSWORDS_DO_NOT_MATCH: 'Пароли не совпадают',
} as const;

export default function ResetPasswordForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [formData, setFormData] = useState<FormData>({ password: "", confirmPassword: "" });

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined, general: undefined }));
    }
  }, [errors]);

  const validateForm = useCallback((): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    if (!formData.password) {
      newErrors.password = ERROR_MESSAGES.PASSWORD_REQUIRED;
    } else if (formData.password.length < PASSWORD_MIN_LENGTH) {
      newErrors.password = ERROR_MESSAGES.PASSWORD_TOO_SHORT;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = ERROR_MESSAGES.CONFIRM_REQUIRED;
    } else if (formData.password && formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = ERROR_MESSAGES.PASSWORDS_DO_NOT_MATCH;
    }

    return newErrors;
  }, [formData]);

  const isFormValid = useCallback((): boolean => {
    return Object.keys(validateForm()).length === 0;
  }, [validateForm]);

  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!token) return;

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setErrors({});

    try {
      await resetPassword({ token, new_password: formData.password }).unwrap();
      navigate('/signin', {
        replace: true,
        state: { message: 'Пароль успешно изменён. Войдите с новым паролем.' },
      });
    } catch (rawError) {
      const error = asApiError(rawError);
      setErrors({
        // detail приходит строкой либо массивом (ошибка валидации FastAPI) —
        // помощник разбирает оба случая. Раньше массив попадал в строковое
        // поле как есть и показывался пользователю как [object Object].
        general: getApiErrorMessage(
          error,
          'Не удалось сбросить пароль. Попробуйте ещё раз позже.',
        ),
      });
    }
  }, [token, formData, validateForm, resetPassword, navigate]);

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-white dark:bg-gray-900">
        <div className="w-full max-w-md mx-auto px-4 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90 mb-2">
            Ссылка недействительна
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            В ссылке отсутствует токен сброса пароля. Запросите сброс пароля ещё раз.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Запросить сброс пароля
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-white dark:bg-gray-900">
      <div className="w-full max-w-md mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Новый пароль
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Придумайте новый пароль для вашей учётной записи
          </p>
        </div>

        <div>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {errors.general && (
                <div className="p-3 text-sm text-error-500 bg-error-50 border border-error-200 rounded-lg dark:bg-error-900/20 dark:border-error-800">
                  {errors.general}
                </div>
              )}

              <div>
                <Label>
                  Новый пароль <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Введите новый пароль"
                    error={!!errors.password}
                    hint={errors.password}
                    disabled={isLoading}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2 ${
                      isLoading ? 'pointer-events-none opacity-50' : ''
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

              <div>
                <Label>
                  Подтвердите пароль <span className="text-error-500">*</span>
                </Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Повторите новый пароль"
                  error={!!errors.confirmPassword}
                  hint={errors.confirmPassword}
                  disabled={isLoading}
                />
              </div>

              <button type="submit" style={{ display: 'none' }}>Submit</button>
            </div>
          </form>

          <div className="mt-6">
            <Button
              className="w-full"
              size="sm"
              onClick={() => {
                const form = document.querySelector('form');
                if (form) form.requestSubmit();
              }}
              disabled={isLoading || !isFormValid()}
            >
              {isLoading ? "Сохранение..." : "Сбросить пароль"}
            </Button>
          </div>

          <div className="mt-5 text-center">
            <p className="text-sm font-normal text-gray-700 dark:text-gray-400">
              <Link to="/signin" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
                Вернуться на страницу входа
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
