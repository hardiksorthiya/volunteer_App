import React, { useEffect, useRef, useState } from 'react';
import '../css/PageHeader.css';

const PageHeader = ({ title, subtitle, children, backButton }) => {
  const headerRef = useRef(null);
  const spacerRef = useRef(null);
  const [isSticky, setIsSticky] = useState(false);
  const [headerWidth, setHeaderWidth] = useState(null);
  const [headerLeft, setHeaderLeft] = useState(null);
  const [headerHeight, setHeaderHeight] = useState(null);

  useEffect(() => {
    const updateHeaderPosition = () => {
      if (headerRef.current) {
        const rect = headerRef.current.getBoundingClientRect();
        const container = headerRef.current.closest('.profile-container, .activities-container, .chat-container, .dashboard-container, .users-container, .roles-container, .permissions-container, .activity-detail-container');
        
        if (container) {
          const containerRect = container.getBoundingClientRect();
          // Use container's left position to avoid sidebar overlay
          setHeaderWidth(containerRect.width);
          setHeaderLeft(containerRect.left);
        } else {
          // Fallback: check if sidebar exists and add its width
          const sidebar = document.querySelector('.sidebar');
          const sidebarWidth = sidebar ? sidebar.offsetWidth : 280;
          setHeaderWidth(window.innerWidth - sidebarWidth);
          setHeaderLeft(sidebarWidth);
        }
        setHeaderHeight(rect.height);
      }
    };

    const handleScroll = () => {
      if (headerRef.current) {
        const headerTop = headerRef.current.getBoundingClientRect().top;
        // Add sticky class when header reaches top of viewport
        if (headerTop <= 0) {
          if (!isSticky) {
            setIsSticky(true);
            updateHeaderPosition();
          }
        } else {
          if (isSticky) {
            setIsSticky(false);
          }
        }
      }
    };

    // Check initial position
    handleScroll();
    updateHeaderPosition();

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateHeaderPosition, { passive: true });
    
    // Also listen to scroll on the container if it has overflow
    const container = headerRef.current?.closest('.profile-container, .activities-container, .chat-container, .dashboard-container, .users-container, .roles-container, .permissions-container, .activity-detail-container');
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateHeaderPosition);
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isSticky]);

  const stickyStyle = isSticky && headerLeft !== null && headerWidth !== null ? {
    left: `${headerLeft}px`,
    width: `${headerWidth}px`
  } : {};

  const spacerStyle = isSticky && headerHeight !== null ? {
    height: `${headerHeight}px`,
    marginBottom: '1rem'
  } : {};

  return (
    <>
      <div 
        ref={headerRef}
        className={`page-header ${isSticky ? 'sticky-header' : ''}`}
        style={isSticky ? stickyStyle : {}}
      >
        <div className="page-header-content">
          {backButton && (
            <div className="page-header-back">
              {backButton}
            </div>
          )}
          <div className="page-header-text">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {children && (
            <div className="page-header-actions">
              {children}
            </div>
          )}
        </div>
      </div>
      {isSticky && (
        <div 
          ref={spacerRef}
          className="page-header-spacer"
          style={spacerStyle}
        />
      )}
    </>
  );
};

export default PageHeader;

