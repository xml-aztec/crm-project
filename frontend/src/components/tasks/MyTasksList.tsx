import { useMemo } from 'react';
import { Task, useGetTasksPaginatedQuery, useUpdateTaskStatusMutation } from '../../store/api/tasksApi';
import { formatDateTime, utcToBishkek } from '../../utils/dateUtils';

const PRIORITY_COLORS: Record<Task['priority'], string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface MyTasksListProps {
  onEditTask: (task: Task) => void;
}

export default function MyTasksList({ onEditTask }: MyTasksListProps) {
  const { data, isLoading } = useGetTasksPaginatedQuery({
    status: 'pending',
    page_size: 100,
  });
  const [updateStatus] = useUpdateTaskStatusMutation();

  const buckets = useMemo(() => {
    const items = data?.items ?? [];
    const now = utcToBishkek(new Date());
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const overdue: Task[] = [];
    const today: Task[] = [];
    const upcoming: Task[] = [];

    for (const task of items) {
      const dueBishkek = utcToBishkek(new Date(task.due_at));
      if (dueBishkek < startOfToday) {
        overdue.push(task);
      } else if (dueBishkek < startOfTomorrow) {
        today.push(task);
      } else {
        upcoming.push(task);
      }
    }

    const byDueAsc = (a: Task, b: Task) => a.due_at.localeCompare(b.due_at);
    return {
      overdue: overdue.sort(byDueAsc),
      today: today.sort(byDueAsc),
      upcoming: upcoming.sort(byDueAsc),
    };
  }, [data]);

  const handleDone = (id: number) => updateStatus({ id, status: 'done' });
  const handleCancel = (id: number) => updateStatus({ id, status: 'cancelled' });

  const renderSection = (label: string, tasks: Task[], accentClass: string) => {
    if (tasks.length === 0) return null;
    return (
      <div className="mb-4">
        <h4 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${accentClass}`}>
          {label} ({tasks.length})
        </h4>
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-start gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
            >
              <button
                onClick={() => handleDone(task.id)}
                title="Отметить выполненной"
                className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-gray-300 hover:border-brand-500 dark:border-gray-600"
              />
              <button
                onClick={() => onEditTask(task)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                    {task.title}
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[task.priority]}`}>
                    {task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                  </span>
                </div>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {formatDateTime(task.due_at)}
                </span>
              </button>
              <button
                onClick={() => handleCancel(task.id)}
                title="Отменить задачу"
                className="shrink-0 text-xs text-gray-400 hover:text-error-500"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">Мои задачи</h3>
      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Загрузка...</div>
      ) : (
        <>
          {renderSection('Просрочено', buckets.overdue, 'text-error-500')}
          {renderSection('Сегодня', buckets.today, 'text-brand-500')}
          {renderSection('Предстоящие', buckets.upcoming, 'text-gray-500 dark:text-gray-400')}
          {buckets.overdue.length === 0 && buckets.today.length === 0 && buckets.upcoming.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Задач нет</p>
          )}
        </>
      )}
    </div>
  );
}
