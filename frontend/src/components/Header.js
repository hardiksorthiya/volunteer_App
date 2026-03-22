import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSidebar } from '../contexts/SidebarContext';
import { MenuIcon } from './Icons';
import api from '../config/api';
import 'bootstrap/dist/css/bootstrap.min.css';
import './css/Header.css';

// Helper function to get full image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;

  // If already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Get API base URL and construct image URL
  const apiBaseUrl = api.defaults.baseURL || '/api';

  // For localhost, use the backend URL directly
  if (apiBaseUrl.includes('localhost:3000') || apiBaseUrl.includes('127.0.0.1:3000')) {
    return `http://localhost:3000${imagePath}`;
  }

  // For production, use relative path (should work if backend serves static files)
  return imagePath;
};

const Header = () => {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleSidebar, isOpen } = useSidebar();
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 992);
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Page title mapping based on route
  const getPageTitle = () => {
    const path = location.pathname;
    
    // Exact matches first
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/admin-dashboard') return 'Admin Dashboard';
    if (path === '/activities') return 'Activities';
    if (path === '/activities/add') return 'Add Activity';
    if (path === '/profile') return 'Profile';
    if (path === '/profile/edit') return 'Edit Profile';
    if (path === '/users') return 'User Management';
    if (path === '/users') return 'User Management';
    if (path === '/chat') return 'AI Chat';
    if (path === '/roles') return 'Role Management';
    if (path === '/permissions') return 'Permissions Management';
    if (path === '/history') return 'History';
    if (path === '/settings') return 'Settings';
    
    // Dynamic routes
    if (path.startsWith('/activities/') && path.includes('/edit')) {
      return 'Edit Activity';
    }
    if (path.startsWith('/activities/')) {
      return 'Activity Details';
    }
    
    // Default
    return 'Dashboard';
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 992);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.user-dropdown')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDropdown]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const handleProfileClick = () => {
    setShowDropdown(false);
    navigate('/profile');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getUserImage = () => {
    const imagePath = user?.image || user?.profile_image;
    if (imagePath) {
      return getImageUrl(imagePath);
    }
    return null;
  };

  if (!token) {
    return null;
  }

  return (
    <header 
      className="bg-light border-bottom position-fixed top-0 end-0" 
      style={{ 
        left: isMobile ? '0' : (isOpen ? '280px' : '80px'),
        height: '70px', 
        zIndex: 999,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'left 0.3s ease'
      }}
    >
      <div className="d-flex align-items-center justify-content-between h-100" style={{ paddingLeft: '1rem', paddingRight: '1rem', width: '100%' }}>
        <div className="d-flex align-items-center">
          <button 
            className="btn btn-link text-dark p-2 me-3" 
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <MenuIcon className="" />
          </button>
          <h1 className="mb-0 fw-semibold fs-5">{getPageTitle()}</h1>
        </div>
        
        {/* User Profile Dropdown */}
        <div className="user-dropdown position-relative">
          <button
            className="btn btn-link p-0 border-0"
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ 
              width: '40px', 
              height: '40px',
              borderRadius: '50%',
              overflow: 'hidden',
              padding: '2px',
              background: 'transparent',
              border: '2px solid #e2e8f0',
              cursor: 'pointer'
            }}
            aria-label="User menu"
          >
            {getUserImage() ? (
              <img 
                src={getUserImage()} 
                alt={user?.name || 'User'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '50%'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                display: getUserImage() ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              {getInitials(user?.name || 'User')}
            </div>
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div 
              className="dropdown-menu show"
              style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                marginTop: '0.5rem',
                minWidth: '180px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                zIndex: 1000,
                backgroundColor: 'white'
              }}
            >
              <div className="px-3 py-2 border-bottom" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <div className="fw-semibold" style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                  {user?.name || 'User'}
                </div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {user?.email || ''}
                </div>
              </div>
              <button
                className="dropdown-item"
                onClick={handleProfileClick}
                style={{
                  padding: '0.75rem 1rem',
                  border: 'none',
                  background: 'transparent',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: '#1e293b'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <span style={{ marginRight: '0.5rem' }}>👤</span>
                Profile
              </button>
              <button
                className="dropdown-item"
                onClick={handleLogout}
                style={{
                  padding: '0.75rem 1rem',
                  border: 'none',
                  background: 'transparent',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: '#dc2626'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <span style={{ marginRight: '0.5rem' }}>🚪</span>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
