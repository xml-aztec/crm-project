import { Navigate } from 'react-router';
import { usePermissions } from '../../hooks/usePermissions';

interface RequirePermissionProps {
  permission: string;
  children: React.ReactNode;
}

export default function RequirePermission({ permission, children }: RequirePermissionProps) {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
