import { useEffect, useCallback } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  className?: string;
}

const variantConfig = {
  danger: {
    icon: AlertCircle,
    iconBg: 'bg-red-100',
    iconColor: 'text-danger',
    buttonVariant: 'danger' as const,
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    buttonVariant: 'primary' as const,
  },
  info: {
    icon: Info,
    iconBg: 'bg-surface-hover',
    iconColor: 'text-accent',
    buttonVariant: 'primary' as const,
  },
};

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'info',
  isLoading = false,
  className = '',
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    },
    [isOpen, onConfirm],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="sm" className={className}>
      <div className="flex gap-4">
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${config.iconBg}`}
        >
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-content-primary">{title}</h3>
          <p className="mt-1 text-sm text-content-secondary">{message}</p>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          variant={config.buttonVariant}
          size="sm"
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
