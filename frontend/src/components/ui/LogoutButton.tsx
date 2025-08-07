import React from 'react';
import { useLogout } from '../../hooks/useLogout';
import Button from './button/Button';

interface LogoutButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
  showConfirm?: boolean;
  redirectTo?: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export default function LogoutButton({ 
  variant = 'outline',
  size = 'md',
  className = '',
  children = 'Выйти',
  showConfirm = true,
  redirectTo = '/signin',
  onSuccess,
  onError
}: LogoutButtonProps) {
  const { logout, isLoading } = useLogout({
    showConfirm,
    redirectTo,
    onSuccess,
    onError
  });

  return (
    <Button
      variant={variant}
      size={size}
      onClick={logout}
      className={className}
      disabled={isLoading}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full"></div>
          <span>Выход...</span>
        </div>
      ) : (
        children
      )}
    </Button>
  );
}