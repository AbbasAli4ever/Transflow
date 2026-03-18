"use client";
import type React from "react";
import { useEffect, useRef } from "react";

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const Dropdown: React.FC<DropdownProps> = ({
  isOpen,
  onClose,
  children,
  className = "",
  triggerRef,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (dropdownRef.current?.contains(target)) {
        return;
      }

      if (triggerRef?.current?.contains(target)) {
        return;
      }

      onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, triggerRef]);


  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest('[data-dropdown-item="true"]')) {
          // Defer close so the item's own onClick handler can update state first.
          window.setTimeout(onClose, 0);
        }
      }}
      className={`absolute z-40  right-0 mt-2  rounded-xl border border-gray-200 bg-white  shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark ${className}`}
    >
      {children}
    </div>
  );
};
