/**
 * 新的 Dialog 组件 - 兼容 shadcn/ui 风格
 */

import { ReactNode } from 'react';
import { Dialog as BaseDialog } from './Dialog';
import './Dialog.css';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <BaseDialog
      open={open}
      onClose={() => onOpenChange(false)}
      title=""
    >
      {children}
    </BaseDialog>
  );
}

interface DialogContentProps {
  children: ReactNode;
  className?: string;
}

export function DialogContent({ children, className = '' }: DialogContentProps) {
  return <div className={`dialog-content-wrapper ${className}`}>{children}</div>;
}

interface DialogHeaderProps {
  children: ReactNode;
  className?: string;
}

export function DialogHeader({ children, className = '' }: DialogHeaderProps) {
  return <div className={`dialog-header-wrapper ${className}`}>{children}</div>;
}

interface DialogTitleProps {
  children: ReactNode;
  className?: string;
}

export function DialogTitle({ children, className = '' }: DialogTitleProps) {
  return <h2 className={`dialog-title-text ${className}`}>{children}</h2>;
}

interface DialogDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function DialogDescription({ children, className = '' }: DialogDescriptionProps) {
  return <p className={`dialog-description-text ${className}`}>{children}</p>;
}

interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

export function DialogFooter({ children, className = '' }: DialogFooterProps) {
  return <div className={`dialog-footer-wrapper ${className}`}>{children}</div>;
}
