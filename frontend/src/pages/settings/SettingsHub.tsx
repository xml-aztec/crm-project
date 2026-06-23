import { Link } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useRoleAccess } from "../../hooks/useRoleAccess";

type SettingsLink = {
  name: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
};

type SettingsCategory = {
  title: string;
  items: SettingsLink[];
};

const icon = (d: string) => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={d} />
  </svg>
);

const categories: SettingsCategory[] = [
  {
    title: "Пользователи и доступ",
    items: [
      {
        name: "Все пользователи",
        description: "Учётные записи, роли и доступ сотрудников",
        path: "/users",
        icon: icon("M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"),
      },
      {
        name: "Запросы регистрации",
        description: "Заявки новых сотрудников на доступ к системе",
        path: "/registration-requests",
        icon: icon("M12 4.5v15m7.5-7.5h-15"),
      },
      {
        name: "Должности",
        description: "Справочник должностей сотрудников",
        path: "/config/positions",
        icon: icon("M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0l-1.5 6.5a2 2 0 01-2 1.5H7.5a2 2 0 01-2-1.5L4 13m16 0H4m6-6V5a2 2 0 012-2h0a2 2 0 012 2v2"),
      },
      {
        name: "Роли и права",
        description: "Настройка прав доступа ролей и кастомные роли",
        path: "/settings/roles",
        icon: icon("M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v2"),
      },
    ],
  },
  {
    title: "Каталог товаров",
    items: [
      {
        name: "Категории",
        description: "Категории и подкатегории товаров",
        path: "/categories",
        icon: icon("M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H5a2 2 0 00-2 2v2M7 7h10"),
      },
    ],
  },
  {
    title: "Клиенты",
    items: [
      {
        name: "Типы клиентов",
        description: "Сегменты клиентов и условия работы с ними",
        path: "/customer-types",
        icon: icon("M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"),
      },
    ],
  },
  {
    title: "Филиалы",
    items: [
      {
        name: "Управление филиалами",
        description: "Список филиалов и точек продаж",
        path: "/branches",
        icon: icon("M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"),
      },
    ],
  },
  {
    title: "Финансы",
    items: [
      {
        name: "Способы оплаты",
        description: "Кассы, счета и методы приёма платежей",
        path: "/config/payment-methods",
        icon: icon("M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"),
      },
    ],
  },
  {
    title: "Система",
    items: [
      {
        name: "Общие",
        description: "Основные параметры системы",
        path: "/config/general",
        icon: icon("M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"),
      },
      {
        name: "Уведомления",
        description: "Каналы и правила уведомлений",
        path: "/config/notifications",
        icon: icon("M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"),
        comingSoon: true,
      },
    ],
  },
];

const SettingsHub: React.FC = () => {
  const { isAdmin } = useRoleAccess();

  if (!isAdmin) {
    return (
      <div className="p-6">
        <PageBreadcrumb pageTitle="Настройки" />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Доступ к настройкам есть только у администраторов.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageBreadcrumb pageTitle="Настройки" />

      <div className="space-y-8">
        {categories.map((category) => (
          <div key={category.title}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {category.title}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {category.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-700"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
                    {item.icon}
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 dark:text-white/90">
                        {item.name}
                      </span>
                      {item.comingSoon && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          скоро
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">
                      {item.description}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SettingsHub;
