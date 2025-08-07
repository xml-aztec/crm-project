import React from "react";

interface AlertProps {
  variant?: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  showLink?: boolean;
  linkText?: string;
  linkHref?: string;
  onClose?: () => void;
  className?: string;
}

const Alert: React.FC<AlertProps> = ({
  variant = "info",
  title,
  message,
  showLink = false,
  linkText = "Подробнее",
  linkHref = "#",
  onClose,
  className = "",
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          container:
            "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800",
          icon: "text-green-400 dark:text-green-500",
          title: "text-green-800 dark:text-green-400",
          message: "text-green-700 dark:text-green-300",
          link: "text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300",
          iconPath: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
        };
      case "error":
        return {
          container:
            "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800",
          icon: "text-red-400 dark:text-red-500",
          title: "text-red-800 dark:text-red-400",
          message: "text-red-700 dark:text-red-300",
          link: "text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300",
          iconPath: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
        };
      case "warning":
        return {
          container:
            "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800",
          icon: "text-yellow-400 dark:text-yellow-500",
          title: "text-yellow-800 dark:text-yellow-400",
          message: "text-yellow-700 dark:text-yellow-300",
          link: "text-yellow-600 hover:text-yellow-500 dark:text-yellow-400 dark:hover:text-yellow-300",
          iconPath: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
        };
      case "info":
      default:
        return {
          container:
            "bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800",
          icon: "text-blue-400 dark:text-blue-500",
          title: "text-blue-800 dark:text-blue-400",
          message: "text-blue-700 dark:text-blue-300",
          link: "text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300",
          iconPath: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      className={`rounded-lg border p-4 shadow-sm ${styles.container} ${className}`}
    >
      <div className="flex">
        {/* Icon */}
        <div className="flex-shrink-0">
          <svg
            className={`h-5 w-5 ${styles.icon}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={styles.iconPath}
            />
          </svg>
        </div>

        {/* Content */}
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${styles.title}`}>{title}</h3>
          )}
          <div
            className={`${title ? "mt-2" : ""} text-sm ${styles.message}`}
          >
            <p>{message}</p>
          </div>
          {showLink && (
            <div className="mt-3">
              <div className="-mx-2 -my-1.5 flex">
                <a
                  href={linkHref}
                  className={`rounded-md px-2 py-1.5 text-sm font-medium ${styles.link} hover:bg-opacity-10 hover:bg-current transition-colors`}
                >
                  {linkText}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Close button */}
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onClose}
                className={`inline-flex rounded-md p-1.5 ${styles.icon} hover:bg-opacity-20 hover:bg-current transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
              >
                <span className="sr-only">Закрыть</span>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;
