import { useState } from "react";
import ComponentCard from "../../common/ComponentCard.tsx";
import Label from "../Label.tsx";
import Input from "../input/InputField.tsx";
import Select from "../Select.tsx";
import { EyeCloseIcon, EyeIcon, TimeIcon } from "../../../icons/index.ts";
import DatePicker from "../date-picker.tsx";

export default function DefaultInputs() {
  const [showPassword, setShowPassword] = useState(false);

  const options = [
    { value: "marketing", label: "Маркетинг" },
    { value: "template", label: "Шаблоны" },
    { value: "development", label: "Разработка" },
    { value: "design", label: "Дизайн" },
    { value: "analytics", label: "Аналитика" },
  ];
  
  const handleSelectChange = (_value: string) => {
    // Обработка выбора без логирования
  };

  return (
    <ComponentCard title="Стандартные элементы формы">
      <div className="space-y-6">
        <div>
          <Label htmlFor="input">Обычное поле ввода</Label>
          <Input type="text" id="input" />
        </div>
        <div>
          <Label htmlFor="inputTwo">Поле с плейсхолдером</Label>
          <Input type="text" id="inputTwo" placeholder="info@gmail.com" />
        </div>
        
        <div>
          <Label>Выпадающий список</Label>
          <Select
            options={options}
            placeholder="Выберите отдел"
            onChange={handleSelectChange}
          />
        </div>
        
        <div>
          <Label>Поле для пароля</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Введите ваш пароль"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
            >
              {showPassword ? (
                <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
              ) : (
                <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
              )}
            </button>
          </div>
        </div>

        <div>
          <DatePicker
            id="date-picker"
            label="Выбор даты"
            placeholder="Выберите дату"
            onChange={(_dates, _currentDateString) => {}}
          />
        </div>

        <div>
          <Label htmlFor="tm">Time Picker Input</Label>
          <div className="relative">
            <Input
              type="time"
              id="tm"
              name="tm"
              onChange={(_e) => {}}
            />
            <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
              <TimeIcon className="size-6" />
            </span>
          </div>
        </div>
        <div>
          <Label htmlFor="tm">Input with Payment</Label>
          <div className="relative">
            <Input
              type="text"
              placeholder="Card number"
              className="pl-[62px]"
            />
            <span className="absolute left-0 top-1/2 flex h-11 w-[46px] -translate-y-1/2 items-center justify-center border-r border-gray-200 dark:border-gray-800">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="6.25" cy="10" r="5.625" fill="#E80B26" />
                <circle cx="13.75" cy="10" r="5.625" fill="#F59D31" />
                <path
                  d="M10 14.1924C11.1508 13.1625 11.875 11.6657 11.875 9.99979C11.875 8.33383 11.1508 6.8371 10 5.80713C8.84918 6.8371 8.125 8.33383 8.125 9.99979C8.125 11.6657 8.84918 13.1625 10 14.1924Z"
                  fill="#FC6020"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </ComponentCard>
  );
}
