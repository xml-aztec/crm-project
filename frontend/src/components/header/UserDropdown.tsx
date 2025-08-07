import { useState } from "react";
import { Link } from "react-router";
import { useAppSelector } from "../../hooks/reduxHooks";
import { useLogout } from "../../hooks/useLogout";

const UserDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAppSelector((state) => state.auth);
  const { logout, isLoading: isLoggingOut } = useLogout({
    showConfirm: false, // Не показываем подтверждение в dropdown
    onSuccess: () => setIsOpen(false),
  });

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  // Получаем отображаемые данные пользователя
  const displayName = user?.full_name || "Пользователь";
  const displayEmail = user?.email || "email@example.com";
  const userInitial = user?.full_name?.charAt(0).toUpperCase() || "U";

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2.5 text-gray-700 dropdown-toggle dark:text-gray-300"
        disabled={isLoggingOut}
      >
        <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
          <div className="flex items-center justify-center h-full w-full bg-brand-500 text-white">
            {userInitial}
          </div>
        </div>
        <span className="hidden font-medium text-sm lg:block">
          {displayName}
        </span>
        <svg
          className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-xl dark:bg-gray-800 z-50">
          <div className="p-3">
            <p className="font-medium text-sm text-gray-800 dark:text-white/90">
              {displayName}
            </p>
            <p className="text-gray-500 text-xs dark:text-gray-400">
              {displayEmail}
            </p>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          <div className="p-2">
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={() => setIsOpen(false)}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Мой профиль
            </Link>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-error-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? (
                <>
                  <div className="animate-spin h-4 w-4 border border-current border-t-transparent rounded-full"></div>
                  Выход...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Выйти
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
