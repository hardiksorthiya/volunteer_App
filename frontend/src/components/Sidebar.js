/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HomeIcon, UserIcon, ActivitiesIcon, MessagesIcon, SettingsIcon, PlusIcon, TargetIcon } from './Icons';
import { useSidebar } from '../contexts/SidebarContext';
import api from '../config/api';
import 'bootstrap/dist/css/bootstrap.min.css';
import './css/Sidebar.css';
import logo from '../components/images/logo.png';
import icon from '../components/images/icon.png';

const Sidebar = () => {
  const { isOpen, closeSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasUserManagementAccess, setHasUserManagementAccess] = useState(false);
  const [hasActivityManagementAccess, setHasActivityManagementAccess] = useState(false);
  const [hasAiChatAccess, setHasAiChatAccess] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 992;
    }
    return false;
  });

  // Get user role and check if admin
  const getUserInfo = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const isAdminByType = user.user_type && user.user_type.toLowerCase() === 'admin';
        let role = 1;
        if (user.role !== null && user.role !== undefined) {
          role = Number(user.role);
        } else if (isAdminByType) {
          role = 0;
        }
        const isAdmin = role === 0 || isAdminByType;
        return { role, isAdmin };
      } catch (e) {
        console.error('Error parsing user data:', e);
        return { role: 1, isAdmin: false };
      }
    }
    return { role: 1, isAdmin: false };
  };

  const { isAdmin } = getUserInfo();

  const refreshUserData = async () => {
    try {
      const response = await api.get('/users/me');
      if (response.data.success) {
        localStorage.setItem('user', JSON.stringify(response.data.data));
        return response.data.data;
      }
    } catch (err) {
      console.error('[SIDEBAR] Error refreshing user data:', err);
    }
    return null;
  };

  useEffect(() => {
    if (!token) return;
    
    const userData = localStorage.getItem('user');
    const currentUser = userData ? JSON.parse(userData) : null;
    const currentRole = currentUser?.role !== undefined ? Number(currentUser.role) : (currentUser?.user_type === 'admin' ? 0 : 1);
    
    const checkPermissions = async () => {
      const refreshedUser = await refreshUserData();
      const userToCheck = refreshedUser || currentUser;
      const userRole = userToCheck?.role !== undefined ? Number(userToCheck.role) : (userToCheck?.user_type === 'admin' ? 0 : 1);
      
      setLoading(true);
      let userMgmtAccess = false;
      let activityMgmtAccess = false;
      let aiChatAccess = false;
      
      try {
        const userMgmtResponse = await api.get('/permissions/check/user_management');
        if (userMgmtResponse.data.success && userMgmtResponse.data.hasAccess) {
          userMgmtAccess = true;
        }
      } catch (err) {
        if (isAdmin) userMgmtAccess = true;
      }
      
      try {
        const activityMgmtResponse = await api.get('/permissions/check/activity_management');
        if (activityMgmtResponse.data.success && activityMgmtResponse.data.hasAccess) {
          activityMgmtAccess = true;
        }
      } catch (err) {
        if (isAdmin) activityMgmtAccess = true;
      }
      
      try {
        const aiChatResponse = await api.get('/permissions/check/ai_chat');
        if (aiChatResponse.data.success && aiChatResponse.data.hasAccess) {
          aiChatAccess = true;
        }
      } catch (err) {
        if (isAdmin) aiChatAccess = true;
      }
      
      setHasUserManagementAccess(userMgmtAccess);
      setHasActivityManagementAccess(activityMgmtAccess);
      setHasAiChatAccess(aiChatAccess);

      // Sidebar order requirement:
      // AI Chat -> Activities -> Hourly Target -> Dashboard (plus admin items after)
      const defaultItems = [];
      
      if (aiChatAccess) {
        defaultItems.push({ path: '/chat', icon: MessagesIcon, label: 'AI Chat', adminOnly: false });
      }

      if (activityMgmtAccess) {
        defaultItems.push({ path: '/activities', icon: ActivitiesIcon, label: 'Activities', adminOnly: false });
      }

      defaultItems.push({ path: '/hour-targets', icon: TargetIcon, label: 'Hour Targers', adminOnly: false });

      defaultItems.push({ path: '/dashboard', icon: HomeIcon, label: 'Dashboard', adminOnly: false });

      if (isAdmin) {
        defaultItems.push({ path: '/admin-dashboard', icon: UserIcon, label: 'Admin Dashboard', adminOnly: true });
      }

      if (userMgmtAccess) {
        defaultItems.push({ path: '/users', icon: UserIcon, label: 'User Management', adminOnly: true });
      }

      if (isAdmin) {
        defaultItems.push({ path: '/roles', icon: SettingsIcon, label: 'Roles', adminOnly: true });
      }

      setMenuItems(defaultItems);
      setLoading(false);
    };
    
    checkPermissions();
  }, [token, isAdmin, location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 992);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    navigate('/login');
  };

  if (!token) {
    return null;
  }

  const displayItems = menuItems.length > 0 ? menuItems : [];

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && isMobile && (
        <div 
          className="sidebar-backdrop"
          onClick={closeSidebar}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}
      <aside 
        className={`bg-primary text-white vh-100 position-fixed top-0 start-0 sidebar-mobile ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}
        style={{ 
          width: isOpen ? '280px' : '80px',
          zIndex: 1000,
          transition: 'width 0.3s ease, transform 0.3s ease',
          overflow: 'hidden'
        }}
      >
        <div className="d-flex flex-column h-100 p-3">
          {/* Logo Section with Close Button for Mobile */}
          <div className={`d-flex align-items-center mb-4 pb-3 border-bottom border-white border-opacity-25 ${isOpen ? 'justify-content-between' : 'justify-content-center'}`}>
            <div className={`d-flex align-items-center ${isOpen ? '' : 'justify-content-center'}`} style={{ flex: 1 }}>
              <div className="bg-white text-primary rounded p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', marginRight: isOpen ? '12px' : '0' }}>
              <img
                  src={icon}
                  alt="Volunteer Connect"
                  style={{ width: '42px', height: '42px', objectFit: 'contain' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              {isOpen && (
                <>
                  {/* <img
                    src={logo}
                    alt="Volunteer Connect"
                    style={{ height: '28px', width: 'auto', objectFit: 'contain' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  /> */}
                  <span className="fw-bold" style={{ display: 'flex' }}>Volunteer Connect</span>
                </>
              )}
            </div>
            {/* Close Button - Only visible on mobile when sidebar is open */}
            {isOpen && isMobile && (
              <button
                onClick={closeSidebar}
                className="btn btn-link text-white p-0 ms-2"
                style={{ 
                  width: '32px', 
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  lineHeight: '1',
                  textDecoration: 'none'
                }}
                aria-label="Close sidebar"
              >
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>×</span>
              </button>
            )}
          </div>

        {/* Navigation Menu */}
        <nav className="flex-grow-1 d-flex flex-column">
          {displayItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = location.pathname === item.path || 
                           (item.path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`d-flex align-items-center px-3 py-2 mb-1 rounded text-white text-decoration-none sidebar-nav-link ${
                  isActive ? 'bg-white bg-opacity-25 fw-semibold active' : ''
                } ${isOpen ? 'justify-content-start' : 'justify-content-center'}`}
                title={!isOpen ? item.label : ''}
                onClick={() => {
                  // Close sidebar on mobile when navigation link is clicked
                  if (isMobile) {
                    closeSidebar();
                  }
                }}
              >
                <IconComponent style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                {isOpen && <span>{item.label}</span>}
              </Link>
            );
          })}

          {/* New Activity Button (bottom) */}
          <div style={{ marginTop: 'auto', paddingTop: 8 }}>
            <Link
              to="/activities/add"
              className={`btn btn-light text-primary fw-semibold w-100 d-flex align-items-center text-decoration-none ${
                isOpen ? 'justify-content-center' : 'justify-content-center'
              }`}
              onClick={() => {
                if (isMobile) {
                  closeSidebar();
                }
              }}
              title={!isOpen ? 'New Activity' : ''}
            >
              <PlusIcon style={{ width: '18px', height: '18px', marginRight: isOpen ? '8px' : '0' }} />
              {isOpen && <span>New Activity</span>}
            </Link>
          </div>

          {/* Logout button */}
          {/* <button
            type="button"
            className={`btn btn-outline-danger mt-auto w-100 d-flex align-items-center ${isOpen ? 'justify-content-center' : 'justify-content-center'}`}
            onClick={handleLogout}
            title={!isOpen ? 'Logout' : ''}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <path d="M16 17L21 12L16 7" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 19H6C4.89543 19 4 18.1046 4 17V7C4 5.89543 4.89543 5 6 5H12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {isOpen && <span>Logout</span>}
          </button> */}
        </nav>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
