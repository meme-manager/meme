import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Popover.css';

interface PopoverProps {
  trigger: ReactNode;
  content: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({ trigger, content, open: controlledOpen, onOpenChange }: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  
  // 计算 Popover 位置
  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left + rect.width / 2,
      });
    }
  };
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡到卡片
    const newOpen = !isOpen;
    if (newOpen) {
      updatePosition();
    }
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };
  
  const handleClose = () => {
    if (controlledOpen === undefined) {
      setInternalOpen(false);
    }
    onOpenChange?.(false);
  };
  
  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        triggerRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  
  return (
    <>
      <div className="popover-container">
        <div ref={triggerRef} onClick={handleToggle} className="popover-trigger">
          {trigger}
        </div>
      </div>
      
      {isOpen && createPortal(
        <div 
          ref={popoverRef} 
          className="popover-content"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translateX(-50%)',
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
