import React, { useEffect } from 'react';
import { useSidebar } from '../contexts/SidebarContext';

// Component to add body class based on sidebar state
export const SidebarWrapper = ({ children }) => {
  const { isOpen } = useSidebar();

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('sidebar-open');
      document.body.classList.remove('sidebar-closed');
    } else {
      document.body.classList.add('sidebar-closed');
      document.body.classList.remove('sidebar-open');
    }
    return () => {
      document.body.classList.remove('sidebar-open', 'sidebar-closed');
    };
  }, [isOpen]);

  return <>{children}</>;
};
