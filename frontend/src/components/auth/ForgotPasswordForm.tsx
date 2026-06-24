import { useState, ChangeEvent, FormEvent, useCallback } from "react";
import { Link } from "react-router";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { useForgotPasswordMutation } from "../../store/api/authApi";

interface FormData {
  email: string;
}

interface ValidationErrors {
  email?: string;
  general?: string;
}

const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

const ERROR_MESSAGES = {
  EMAIL_REQUIRED: 'Email обязателен для заполнения',
  EMAIL_INVALID: 'Введите корректный email адрес',
} as const;

export default function ForgotPasswordForm() {
  const [forgotPassword, { isLoading, isSuccess, data }] = useForgotPasswordMutation();

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [formData, setFormData] = useState<FormData>({ email: "" });

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined, general: undefined }));
    }
  }, [errors]);

  const validateForm = useCallback((): ValidationErrors => {
    const newErrors: ValidationErrors = {};
    const email = formData.email.trim();

    if (!email) {
      newErrors.email = ERROR_MESSAGES.EMAIL_REQUIRED;
    } else if (!VALIDATION_RULES.EMAIL_REGEX.test(email)) {
      newErrors.email = ERROR_MESSAGES.EMAIL_INVALID;
    }

    return newErrors;
  }, [formData]);

  const isFormValid = useCallback((): boolean => {
    return Object.keys(validateForm()).length === 0;
  }, [validateForm]);

  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setErrors({});

    try {
      await forgotPassword({ email: formData.email.trim() }).unwrap();
    } catch (error) {
      // Backend всегда отвечает 200 независимо от того, найден email или нет —
      // сюда попадают только реальные сбои (сеть, rate limit, 500).
      setErrors({ general: 'Не удалось отправить запрос. Попробуйте ещё раз позже.' });
    }
  }, [formData, validateForm, forgotPassword]);

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90 mb-2">
              Проверьте почту
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {data?.message || "Если такой email зарегистрирован, на него отправлена ссылка для сброса пароля"}
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

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-white dark:bg-gray-900">
      <div className="w-full max-w-md mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Забыли пароль?
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Введите email, привязанный к вашей учётной записи — мы отправим ссылку для сброса пароля
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
              {isLoading ? "Отправка..." : "Отправить ссылку"}
            </Button>
          </div>

          <div className="mt-5 text-center">
            <p className="text-sm font-normal text-gray-700 dark:text-gray-400">
              Вспомнили пароль?{" "}
              <Link to="/signin" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
