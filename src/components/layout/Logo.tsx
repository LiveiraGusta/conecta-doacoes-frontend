import { Link } from 'react-router';
import { useAuth, homeFor } from '@/core/auth/useAuth';
import { cn } from '@/core/utils/cn';

/** "Conecta / Doações" do design; recolhido mostra só "CD". */
export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { user } = useAuth();
  return (
    <Link
      to={homeFor(user?.role)}
      aria-label="Conecta Doações — início"
      className={cn('flex flex-col leading-none font-bold text-primary-text', className)}
    >
      {compact ? (
        <span className="text-2xl tracking-tight">CD</span>
      ) : (
        <>
          <span className="text-2xl tracking-wide">Conecta</span>
          <span className="text-4xl tracking-wide">Doações</span>
        </>
      )}
    </Link>
  );
}
