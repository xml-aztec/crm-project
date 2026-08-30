import { useEffect, useState } from 'react';
import { Modal } from '../ui/modal';
import Button from '../ui/button/Button';
import Input from '../form/input/InputField';
import TextArea from '../form/input/TextArea';
import Label from '../form/Label';
import {
  Task,
  TaskPriority,
  TaskStatus,
  useCreateTaskMutation,
  useUpdateTaskMutation,
} from '../../store/api/tasksApi';
import { datetimeLocalValueToIso, isoToDatetimeLocalValue } from '../../utils/dateUtils';

type ReminderPreset = 'none' | '15m' | '1h' | '1d' | 'at_due' | 'custom';

const PRESET_OFFSETS_MS: Record<Exclude<ReminderPreset, 'none' | 'at_due' | 'custom'>, number> = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
  initialDueAt?: string; // ISO
  initialCustomerId?: number | null;
  initialCustomerLabel?: string;
  initialOrderId?: number | null;
  initialOrderLabel?: string;
}

export default function TaskModal({
  isOpen,
  onClose,
  task,
  initialDueAt,
  initialCustomerId,
  initialCustomerLabel,
  initialOrderId,
  initialOrderLabel,
}: TaskModalProps) {
  const isEdit = Boolean(task);
  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const isSaving = isCreating || isUpdating;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAtLocal, setDueAtLocal] = useState('');
  const [reminderPreset, setReminderPreset] = useState<ReminderPreset>('none');
  const [reminderAtLocal, setReminderAtLocal] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setDueAtLocal(isoToDatetimeLocalValue(task.due_at));
      setPriority(task.priority);
      setStatus(task.status);
      if (task.reminder_at) {
        setReminderAtLocal(isoToDatetimeLocalValue(task.reminder_at));
        setReminderPreset(task.reminder_at === task.due_at ? 'at_due' : 'custom');
      } else {
        setReminderAtLocal('');
        setReminderPreset('none');
      }
    } else {
      setTitle('');
      setDescription('');
      setDueAtLocal(initialDueAt ? isoToDatetimeLocalValue(initialDueAt) : '');
      setReminderPreset('none');
      setReminderAtLocal('');
      setPriority('medium');
      setStatus('pending');
    }
    setError(null);
  }, [isOpen, task, initialDueAt]);

  const applyPreset = (preset: ReminderPreset) => {
    setReminderPreset(preset);
    if (preset === 'none') {
      setReminderAtLocal('');
      return;
    }
    if (!dueAtLocal) return;
    const dueDate = new Date(datetimeLocalValueToIso(dueAtLocal));
    if (preset === 'at_due') {
      setReminderAtLocal(dueAtLocal);
      return;
    }
    if (preset === 'custom') return;
    const offsetMs = PRESET_OFFSETS_MS[preset];
    const reminderDate = new Date(dueDate.getTime() - offsetMs);
    setReminderAtLocal(isoToDatetimeLocalValue(reminderDate.toISOString()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !dueAtLocal) {
      setError('Укажите название и срок задачи');
      return;
    }

    const due_at = datetimeLocalValueToIso(dueAtLocal);
    const reminder_at = reminderAtLocal ? datetimeLocalValueToIso(reminderAtLocal) : null;

    if (reminder_at && reminder_at > due_at) {
      setError('Напоминание не может быть позже срока задачи');
      return;
    }

    try {
      if (isEdit && task) {
        await updateTask({
          id: task.id,
          data: { title, description: description || null, due_at, reminder_at, priority, status },
        }).unwrap();
      } else {
        await createTask({
          title,
          description: description || null,
          due_at,
          reminder_at,
          priority,
          customer_id: initialCustomerId ?? undefined,
          order_id: initialOrderId ?? undefined,
        }).unwrap();
      }
      onClose();
    } catch (err: any) {
      setError(err?.data?.detail || 'Не удалось сохранить задачу');
    }
  };

  const linkedLabel = initialCustomerLabel || initialOrderLabel;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[600px] m-4">
      <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-8">
        <h4 className="mb-6 text-xl font-semibold text-gray-800 dark:text-white/90">
          {isEdit ? 'Редактирование задачи' : 'Новая задача'}
        </h4>

        {linkedLabel && (
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            Привязано: {linkedLabel}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-500 dark:border-error-800 dark:bg-error-900/20">
              {error}
            </div>
          )}

          <div>
            <Label>
              Название <span className="text-error-500">*</span>
            </Label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Позвонить клиенту"
              disabled={isSaving}
            />
          </div>

          <div>
            <Label>Описание</Label>
            <TextArea value={description} onChange={setDescription} rows={3} disabled={isSaving} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>
                Срок <span className="text-error-500">*</span>
              </Label>
              <Input
                type="datetime-local"
                value={dueAtLocal}
                onChange={(e) => setDueAtLocal(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div>
              <Label>Приоритет</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                disabled={isSaving}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Напоминание</Label>
              <select
                value={reminderPreset}
                onChange={(e) => applyPreset(e.target.value as ReminderPreset)}
                disabled={isSaving}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="none">Без напоминания</option>
                <option value="15m">За 15 минут</option>
                <option value="1h">За 1 час</option>
                <option value="1d">За 1 день</option>
                <option value="at_due">В момент срока</option>
                <option value="custom">Своё время</option>
              </select>
            </div>
            {reminderPreset !== 'none' && (
              <div>
                <Label>Когда напомнить</Label>
                <Input
                  type="datetime-local"
                  value={reminderAtLocal}
                  onChange={(e) => {
                    setReminderPreset('custom');
                    setReminderAtLocal(e.target.value);
                  }}
                  disabled={isSaving}
                />
              </div>
            )}
          </div>

          {isEdit && (
            <div>
              <Label>Статус</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                disabled={isSaving}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="pending">В работе</option>
                <option value="done">Выполнена</option>
                <option value="cancelled">Отменена</option>
              </select>
            </div>
          )}

          <div className="mt-2 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
