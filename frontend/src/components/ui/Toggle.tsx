import { useState } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export default function Toggle({ checked, onChange, disabled = false, size = 'md' }: ToggleProps) {
  const [isChanging, setIsChanging] = useState(false);

  const handleToggle = async () => {
    if (disabled || isChanging) return;
    
    setIsChanging(true);
    try {
      await onChange(!checked);
    } finally {
      setIsChanging(false);
    }
  };

  const sizeClasses = {
    sm: {
      container: 'w-10 h-5',
      circle: 'w-4 h-4',
      translate: checked ? 'translate-x-5' : 'translate-x-0.5'
    },
    md: {
      container: 'w-12 h-6',
      circle: 'w-5 h-5',
      translate: checked ? 'translate-x-6' : 'translate-x-0.5'
    }
  };

  const classes = sizeClasses[size];

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled || isChanging}
      className={`
        relative inline-flex ${classes.container} flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
        ${checked 
          ? 'bg-brand-600 dark:bg-brand-500' 
          : 'bg-gray-200 dark:bg-gray-600'
        }
        ${(disabled || isChanging) ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      aria-checked={checked}
      role="switch"
    >
      <span
        className={`
          ${classes.translate} pointer-events-none inline-block ${classes.circle} transform rounded-full 
          bg-white shadow ring-0 transition duration-200 ease-in-out
          ${isChanging ? 'animate-pulse' : ''}
        `}
      />
    </button>
  );
}