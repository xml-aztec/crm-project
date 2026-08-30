import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import {
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
  NotificationChannel,
} from '../../store/api/notificationsApi';

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: 'Email',
  in_app: 'В приложении (колокольчик)',
};

export default function Notifications() {
  const { data: preferences = [], isLoading } = useGetNotificationPreferencesQuery();
  const [updatePreferences, { isLoading: isSaving }] = useUpdateNotificationPreferencesMutation();

  const typeCodesInOrder = Array.from(new Set(preferences.map((p) => p.notification_type_code)));
  const channels: NotificationChannel[] = ['email', 'in_app'];

  const handleToggle = (typeCode: string, channel: NotificationChannel, enabled: boolean) => {
    updatePreferences([{ notification_type_code: typeCode, channel, enabled }]);
  };

  return (
    <>
      <PageBreadCrumb pageTitle="Настройки уведомлений" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          Настройки уведомлений
        </h3>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Выберите, какие уведомления получать и по каким каналам.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-brand-500" />
          </div>
        ) : typeCodesInOrder.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Пока нет настраиваемых типов уведомлений.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 pr-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Тип уведомления
                  </th>
                  {channels.map((channel) => (
                    <th
                      key={channel}
                      className="py-3 px-4 text-center text-sm font-medium text-gray-500 dark:text-gray-400"
                    >
                      {CHANNEL_LABELS[channel]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {typeCodesInOrder.map((typeCode) => {
                  const label =
                    preferences.find((p) => p.notification_type_code === typeCode)?.notification_type_label ??
                    typeCode;
                  return (
                    <tr key={typeCode}>
                      <td className="py-4 pr-4 text-sm font-medium text-gray-800 dark:text-white/90">
                        {label}
                      </td>
                      {channels.map((channel) => {
                        const pref = preferences.find(
                          (p) => p.notification_type_code === typeCode && p.channel === channel
                        );
                        const enabled = pref?.enabled ?? false;
                        return (
                          <td key={channel} className="py-4 px-4 text-center">
                            <button
                              role="switch"
                              aria-checked={enabled}
                              disabled={isSaving}
                              onClick={() => handleToggle(typeCode, channel, !enabled)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                                enabled ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                            >
                              <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                  enabled ? 'translate-x-5' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
