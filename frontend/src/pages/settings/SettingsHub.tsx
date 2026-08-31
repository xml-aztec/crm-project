import { useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useRoleAccess } from "../../hooks/useRoleAccess";
import { useGetAllUsersQuery, useGetPendingUsersQuery } from "../../store/api/usersManagementApi";
import { useGetPositionsQuery } from "../../store/api/positionsApi";
import { useGetRolesQuery } from "../../store/api/rbacApi";
import { useGetCategoriesQuery, useGetSubcategoriesQuery } from "../../store/api/catalogApi";
import { useGetCustomerTypesQuery } from "../../store/api/customerTypesApi";
import { useGetBranchesQuery } from "../../store/api/branchesApi";
import { useGetPaymentMethodsQuery } from "../../store/api/paymentMethodsApi";

type BadgeVariant = "count" | "warning" | "soon";

type SettingsItem = {
  name: string;
  description: string;
  path: string;
  badge?: string;
  badgeVariant?: BadgeVariant;
  icon: React.ReactNode;
  disabled?: boolean;
};

type SettingsCategory = {
  key: string;
  chipLabel: string;
  chipIcon: React.ReactNode;
  accent: "primary" | "neutral";
  items: SettingsItem[];
};

// Иконки — 1:1 с макетом дизайна (lucide-style, stroke-based)
const ChipUsersIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" />
  </svg>
);
const ChipCatalogIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
  </svg>
);
const ChipCustomersIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" />
  </svg>
);
const ChipBranchesIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 8h2" /><path d="M13 8h2" /><path d="M9 12h2" /><path d="M13 12h2" /><path d="M10 21v-4h4v4" />
  </svg>
);
const ChipFinanceIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20" /><path d="M17 6.5a3.5 3.5 0 0 0-3.5-2.5h-3a3 3 0 0 0 0 6h3a3 3 0 0 1 0 6h-3A3.5 3.5 0 0 1 7 17.5" />
  </svg>
);
const ChipSystemIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V10a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const RowUsersIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" />
  </svg>
);
const RowUserPlusIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6" /><path d="M16 11h6" />
  </svg>
);
const RowIdCardIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="14" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </svg>
);
const RowLockIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
const RowFolderIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);
const RowBellIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
  </svg>
);
const ChevronIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

const ROW_ICON_BG: Record<SettingsCategory["accent"], string> = {
  primary: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  neutral: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300",
};

const CHIP_ACTIVE = "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
const CHIP_INACTIVE = "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5";

function RowBadge({ text, variant }: { text: string; variant?: BadgeVariant }) {
  if (variant === "warning") {
    return (
      <span className="inline-flex items-center h-[22px] px-2.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400 text-xs font-bold whitespace-nowrap">
        {text}
      </span>
    );
  }
  if (variant === "soon") {
    return (
      <span className="inline-flex items-center h-5 px-2 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 text-[11px] font-bold whitespace-nowrap">
        {text}
      </span>
    );
  }
  return <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{text}</span>;
}

function SettingsRow({ item, accent }: { item: SettingsItem; accent: SettingsCategory["accent"] }) {
  const content = (
    <>
      <span className={`w-[38px] h-[38px] shrink-0 rounded-xl flex items-center justify-center ${ROW_ICON_BG[accent]}`}>
        {item.icon}
      </span>
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className={`text-[15px] font-bold ${item.disabled ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white"}`}>
            {item.name}
          </span>
          {item.badgeVariant === "soon" && <RowBadge text={item.badge!} variant="soon" />}
        </span>
        <span className={`text-[13px] ${item.disabled ? "text-gray-400 dark:text-gray-500" : "text-gray-500 dark:text-gray-400"}`}>
          {item.description}
        </span>
      </span>
      {item.badge && item.badgeVariant !== "soon" && <RowBadge text={item.badge} variant={item.badgeVariant} />}
      {!item.disabled && <span className="text-gray-300 dark:text-gray-600">{<ChevronIcon />}</span>}
    </>
  );

  if (item.disabled) {
    return (
      <div className="flex items-center gap-3.5 px-[18px] py-4 opacity-65">
        {content}
      </div>
    );
  }

  return (
    <Link
      to={item.path}
      className="flex items-center gap-3.5 px-[18px] py-4 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
    >
      {content}
    </Link>
  );
}

function SettingsSection({
  title,
  subtitle,
  items,
  accent,
  sectionRef,
}: {
  title: string;
  subtitle: string;
  items: SettingsItem[];
  accent: SettingsCategory["accent"];
  sectionRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (items.length === 0) return null;

  return (
    <div ref={sectionRef} className="flex flex-col gap-3 scroll-mt-6">
      <div className="flex items-baseline gap-2.5">
        <span className="text-lg font-extrabold text-gray-900 dark:text-white">{title}</span>
        <span className="text-sm text-gray-400 dark:text-gray-500">{subtitle}</span>
      </div>
      <div className="bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
        {items.map((item) => (
          <SettingsRow key={item.path} item={item} accent={accent} />
        ))}
      </div>
    </div>
  );
}

const SettingsHub: React.FC = () => {
  const { isAdmin } = useRoleAccess();
  const [search, setSearch] = useState("");
  const [activeChip, setActiveChip] = useState("users");

  // Реальные счётчики — те же данные, что уже используются на страницах,
  // на которые ведут пункты настроек (не выдуманные значения из макета).
  const { data: allUsers = [] } = useGetAllUsersQuery(undefined, { skip: !isAdmin });
  const { data: pendingUsers = [] } = useGetPendingUsersQuery(undefined, { skip: !isAdmin });
  const { data: positions = [] } = useGetPositionsQuery(undefined, { skip: !isAdmin });
  const { data: roles = [] } = useGetRolesQuery(undefined, { skip: !isAdmin });
  const { data: categories = [] } = useGetCategoriesQuery(undefined, { skip: !isAdmin });
  const { data: subcategories = [] } = useGetSubcategoriesQuery(undefined, { skip: !isAdmin });
  const { data: customerTypes = [] } = useGetCustomerTypesQuery(undefined, { skip: !isAdmin });
  const { data: branches = [] } = useGetBranchesQuery(undefined, { skip: !isAdmin });
  const { data: paymentMethods = [] } = useGetPaymentMethodsQuery(undefined, { skip: !isAdmin });

  const activeUsersCount = useMemo(() => allUsers.filter((u) => u.is_active).length, [allUsers]);

  const categoriesList: SettingsCategory[] = useMemo(
    () => [
      {
        key: "users",
        chipLabel: "Пользователи и доступ",
        chipIcon: <ChipUsersIcon />,
        accent: "primary",
        items: [
          {
            name: "Все пользователи",
            description: "Учётные записи, роли и доступ сотрудников",
            path: "/users",
            badge: `${activeUsersCount} активных`,
            icon: <RowUsersIcon />,
          },
          {
            name: "Запросы регистрации",
            description: "Заявки новых сотрудников на доступ к системе",
            path: "/registration-requests",
            badge: `${pendingUsers.length} новых`,
            badgeVariant: "warning",
            icon: <RowUserPlusIcon />,
          },
          {
            name: "Должности",
            description: "Справочник должностей сотрудников",
            path: "/config/positions",
            badge: `${positions.length} записей`,
            icon: <RowIdCardIcon />,
          },
          {
            name: "Роли и права",
            description: "Настройка прав доступа ролей и кастомные роли",
            path: "/settings/roles",
            badge: `${roles.length} ролей`,
            icon: <RowLockIcon />,
          },
        ],
      },
      {
        key: "catalog",
        chipLabel: "Каталог товаров",
        chipIcon: <ChipCatalogIcon />,
        accent: "neutral",
        items: [
          {
            name: "Категории",
            description: "Категории и подкатегории товаров",
            path: "/categories",
            badge: `${categories.length} / ${subcategories.length}`,
            icon: <RowFolderIcon />,
          },
        ],
      },
      {
        key: "customers",
        chipLabel: "Клиенты",
        chipIcon: <ChipCustomersIcon />,
        accent: "neutral",
        items: [
          {
            name: "Типы клиентов",
            description: "Сегменты клиентов и условия работы с ними",
            path: "/customer-types",
            badge: `${customerTypes.length} типов`,
            icon: <ChipCustomersIcon />,
          },
        ],
      },
      {
        key: "branches",
        chipLabel: "Филиалы",
        chipIcon: <ChipBranchesIcon />,
        accent: "neutral",
        items: [
          {
            name: "Управление филиалами",
            description: "Список филиалов и точек продаж",
            path: "/branches",
            badge: `${branches.length} филиалов`,
            icon: <ChipBranchesIcon />,
          },
        ],
      },
      {
        key: "finance",
        chipLabel: "Финансы",
        chipIcon: <ChipFinanceIcon />,
        accent: "neutral",
        items: [
          {
            name: "Способы оплаты",
            description: "Кассы, счета и методы приёма платежей",
            path: "/config/payment-methods",
            badge: `${paymentMethods.length} методов`,
            icon: <ChipFinanceIcon />,
          },
        ],
      },
      {
        key: "system",
        chipLabel: "Система",
        chipIcon: <ChipSystemIcon />,
        accent: "neutral",
        items: [
          {
            name: "Общие",
            description: "Основные параметры системы",
            path: "/config/general",
            icon: <ChipSystemIcon />,
          },
          {
            name: "Уведомления",
            description: "Каналы и правила уведомлений",
            path: "/config/notifications",
            badge: "скоро",
            badgeVariant: "soon",
            icon: <RowBellIcon />,
            disabled: true,
          },
        ],
      },
    ],
    [activeUsersCount, pendingUsers.length, positions.length, roles.length, categories.length, subcategories.length, customerTypes.length, branches.length, paymentMethods.length]
  );

  const matchesSearch = (item: SettingsItem) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
  };

  const usersRef = useRef<HTMLDivElement>(null);
  const referenceRef = useRef<HTMLDivElement>(null);
  const systemRef = useRef<HTMLDivElement>(null);

  const sectionRefByChip: Record<string, React.RefObject<HTMLDivElement | null>> = {
    users: usersRef,
    catalog: referenceRef,
    customers: referenceRef,
    branches: referenceRef,
    finance: referenceRef,
    system: systemRef,
  };

  const handleChipClick = (key: string) => {
    setActiveChip(key);
    sectionRefByChip[key]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const byKey = (key: string) => categoriesList.find((c) => c.key === key)!;
  const referenceItems = ["catalog", "customers", "branches", "finance"].flatMap((key) => {
    const category = byKey(key);
    return category.items.filter(matchesSearch).map((item) => ({ item, accent: category.accent }));
  });

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Доступ к настройкам есть только у администраторов.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-gray-800 rounded-[18px] overflow-hidden shadow-theme-xs">
        {/* Заголовок */}
        <div className="flex items-center justify-between gap-6 px-7 py-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Настройки</span>
            <span className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
              <Link to="/" className="hover:text-gray-600 dark:hover:text-gray-300">Home</Link>
              <span>·</span>
              <span>Настройки</span>
            </span>
          </div>
          <div className="flex items-center gap-2.5 h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 w-full max-w-[320px] shrink-0">
            <span className="text-gray-400 dark:text-gray-500 shrink-0">
              <SearchIcon />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Найти настройку…"
              className="bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none w-full"
            />
          </div>
        </div>

        {/* Чипсы-фильтры по группам */}
        <div className="flex flex-wrap gap-1.5 px-6 py-3 border-b border-gray-100 dark:border-gray-800">
          {categoriesList.map((category) => (
            <button
              key={category.key}
              type="button"
              onClick={() => handleChipClick(category.key)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm font-bold whitespace-nowrap transition-colors ${
                activeChip === category.key ? CHIP_ACTIVE : CHIP_INACTIVE
              }`}
            >
              {category.chipIcon}
              {category.chipLabel}
              <span className={activeChip === category.key ? "text-blue-300 dark:text-blue-500/60" : "text-gray-300 dark:text-gray-600"}>
                {category.items.length}
              </span>
            </button>
          ))}
        </div>

        {/* Секции */}
        <div className="flex flex-col gap-7 px-7 py-8">
          <SettingsSection
            sectionRef={usersRef}
            title="Пользователи и доступ"
            subtitle="Кто работает в системе и что им доступно"
            items={byKey("users").items.filter(matchesSearch)}
            accent="primary"
          />

          {referenceItems.length > 0 && (
            <div ref={referenceRef} className="flex flex-col gap-3 scroll-mt-6">
              <div className="flex items-baseline gap-2.5">
                <span className="text-lg font-extrabold text-gray-900 dark:text-white">Справочники</span>
                <span className="text-sm text-gray-400 dark:text-gray-500">Каталог, клиенты, филиалы, финансы</span>
              </div>
              <div className="bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                {referenceItems.map(({ item, accent }) => (
                  <SettingsRow key={item.path} item={item} accent={accent} />
                ))}
              </div>
            </div>
          )}

          <SettingsSection
            sectionRef={systemRef}
            title="Система"
            subtitle="Параметры и оповещения"
            items={byKey("system").items.filter(matchesSearch)}
            accent="neutral"
          />

          {search.trim() &&
            byKey("users").items.filter(matchesSearch).length === 0 &&
            referenceItems.length === 0 &&
            byKey("system").items.filter(matchesSearch).length === 0 && (
              <div className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
                Ничего не найдено по запросу «{search}»
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SettingsHub;
