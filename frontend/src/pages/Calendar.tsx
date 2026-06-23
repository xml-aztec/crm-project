import { useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import ruLocale from "@fullcalendar/core/locales/ru";
import PageMeta from "../components/common/PageMeta";

// Пока только просмотр дат — добавление и редактирование задач реализуем позже.
const Calendar: React.FC = () => {
  const calendarRef = useRef<FullCalendar>(null);

  return (
    <>
      <PageMeta
        title="Календарь | TechStore"
        description="Просмотр календаря по месяцам, неделям и дням"
      />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="custom-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="dayGridMonth"
            locales={[ruLocale]}
            locale="ru"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
          />
        </div>
      </div>
    </>
  );
};

export default Calendar;
