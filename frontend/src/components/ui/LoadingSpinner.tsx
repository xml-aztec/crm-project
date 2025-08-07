interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export default function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };

  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
        <div className={`animate-spin ${sizeClasses[size]} border-2 border-gray-300 border-t-blue-500 rounded-full`}></div>
        {text && <span className="text-lg font-medium">{text}</span>}
      </div>
    </div>
  );
}