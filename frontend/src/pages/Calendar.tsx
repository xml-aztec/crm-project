import { useCallback, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import { EventClickArg, DatesSetArg, EventDropArg } from "@fullcalendar/core";
import ruLocale from "@fullcalendar/core/locales/ru";
import PageMeta from "../components/common/PageMeta";
import TaskModal from "../components/tasks/TaskModal";
import MyTasksList from "../components/tasks/MyTasksList";
import { Task, useGetTasksPaginatedQuery, useUpdateTaskMutation } from "../store/api/tasksApi";

const STATUS_COLORS: Record<Task["status"], Record<Task["priority"], string>> = {
  pending: { low: "#9ca3af", medium: "#465fff", high: "#ef4444" },
  done: { low: "#6ee7b7", medium: "#34d399", high: "#10b981" },
  cancelled: { low: "#d1d5db", medium: "#d1d5db", high: "#d1d5db" },
};

function toDateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const Calendar: React.FC = () => {
  const calendarRef = useRef<FullCalendar>(null);
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const [showCancelled, setShowCancelled] = useState(false);
  const [modalState, setModalState] = useState<{ open: boolean; task: Task | null; initialDueAt?: string }>({
    open: false,
    task: null,
  });

  const { data } = useGetTasksPaginatedQuery({
    date_from: range.from,
    date_to: range.to,
    // Максимум на бэкенде — 100 (Query(..., le=100)); 200 здесь давало 422 на
    // каждый рендер, а раз запрос не резолвился, data оставался undefined и
    // events (см. ниже) пересобирался в новый пустой массив на каждый рендер —
    // это и раскручивало бесконечный цикл обновлений внутри FullCalendar
    // (React error #185).
    page_size: 100,
  });
  const [updateTask] = useUpdateTaskMutation();

  const tasks = useMemo(
    () => (data?.items ?? []).filter((t) => showCancelled || t.status !== "cancelled"),
    [data, showCancelled]
  );

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    const from = toDateOnly(arg.start);
    const to = toDateOnly(arg.end);
    // FullCalendar может звать datesSet повторно с тем же диапазоном — не
    // обновляем состояние (и не триггерим лишний рендер), если он не изменился.
    setRange((prev) => (prev.from === from && prev.to === to ? prev : { from, to }));
  }, []);

  const handleDateClick = useCallback((arg: DateClickArg) => {
    setModalState({ open: true, task: null, initialDueAt: arg.date.toISOString() });
  }, []);

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      const task = tasks.find((t) => String(t.id) === arg.event.id);
      if (task) setModalState({ open: true, task });
    },
    [tasks]
  );

  const handleEventDrop = useCallback(
    async (arg: EventDropArg) => {
      const taskId = Number(arg.event.id);
      const newDue = arg.event.start;
      if (!newDue) return;
      try {
        await updateTask({ id: taskId, data: { due_at: newDue.toISOString() } }).unwrap();
      } catch {
        arg.revert();
      }
    },
    [updateTask]
  );

  const closeModal = () => setModalState({ open: false, task: null });

  const events = useMemo(
    () =>
      tasks.map((task) => ({
        id: String(task.id),
        title: task.title,
        start: task.due_at,
        backgroundColor: STATUS_COLORS[task.status][task.priority],
        borderColor: STATUS_COLORS[task.status][task.priority],
        textColor: task.status === "cancelled" ? "#6b7280" : "#ffffff",
      })),
    [tasks]
  );

  return (
    <>
      <PageMeta
        title="Календарь | LeadFlow"
        description="Задачи и напоминания по дням, неделям и месяцам"
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="xl:col-span-3 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between px-4 pt-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={showCancelled}
                onChange={(e) => setShowCancelled(e.target.checked)}
              />
              Показывать отменённые
            </label>
          </div>
          <div className="custom-calendar">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locales={[ruLocale]}
              locale="ru"
              editable
              selectable
              events={events}
              datesSet={handleDatesSet}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
            />
          </div>
        </div>
        <div className="xl:col-span-1">
          <MyTasksList onEditTask={(task) => setModalState({ open: true, task })} />
        </div>
      </div>

      <TaskModal
        isOpen={modalState.open}
        onClose={closeModal}
        task={modalState.task}
        initialDueAt={modalState.initialDueAt}
      />
    </>
  );
};

export default Calendar;
