import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  useGetNotificationsPaginatedQuery,
  useGetUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
  type AppNotification,
} from '../../store/api/notificationsApi';

function timeAgo(isoDate: string): string {
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} д назад`;
}

function typeIcon(type: string | null): string {
  switch (type) {
    case 'order': return '🛒';
    case 'user': return '👤';
    case 'task_reminder': return '⏰';
    default: return '🔔';
  }
}

function getLink(notif: AppNotification): string | null {
  if (notif.type === 'order' && notif.entity_id) return `/orders/${notif.entity_id}`;
  if (notif.type === 'task_reminder' && notif.entity_id) return `/calendar?task=${notif.entity_id}`;
  if (notif.type === 'user') return '/';
  return null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useGetNotificationsPaginatedQuery(page, {
    pollingInterval: 30000,
    skip: false,
  });
  const notifications = data?.items ?? [];
  const hasMore = data ? page < data.total_pages : false;

  const { data: unreadData } = useGetUnreadCountQuery(undefined, { pollingInterval: 30000 });

  const [markRead] = useMarkReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllReadMutation();

  const unreadCount = unreadData?.count ?? 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) setPage(1);
  }, [isOpen]);

  const handleNotifClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      await markRead(notif.id);
    }
    const link = getLink(notif);
    if (link) {
      navigate(link);
      onClose();
    }
  };

  const handleMarkAll = async () => {
    await markAllRead();
  };

  return (
    <div ref={dropdownRef} className="relative">
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 flex flex-col rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800 z-50 max-h-[480px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Уведомления
              </h5>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={isMarkingAll}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
              >
                Прочитать все
              </button>
            )}
          </div>

          {/* List */}
          <ul className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <li className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Загрузка...
              </li>
            ) : notifications.length === 0 ? (
              <li className="px-4 py-8 text-center">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Нет уведомлений</p>
              </li>
            ) : (
              notifications.map((notif) => (
                <li key={notif.id}>
                  <button
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      !notif.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{typeIcon(notif.type)}</span>
                    <span className="flex-1 min-w-0">
                      <span className={`block text-sm truncate ${!notif.is_read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {notif.title}
                      </span>
                      {notif.message && (
                        <span className="block text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {notif.message}
                        </span>
                      )}
                      <span className="block text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {timeAgo(notif.created_at)}
                      </span>
                    </span>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>

          {hasMore && (
            <div className="border-t border-gray-100 p-2 dark:border-gray-700">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={isFetching}
                className="w-full rounded-lg py-2 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700/50"
              >
                {isFetching ? 'Загрузка...' : 'Показать ещё'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
