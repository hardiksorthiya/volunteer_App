import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EditIcon, UserIcon, EmailIcon, PhoneIcon, CalendarIcon } from '../components/Icons';
import api from '../config/api';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/me');
      if (response.data.success) {
        setUser(response.data.data);
        setImageError(false);
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(response.data.data));
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads')) {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
      return apiUrl.replace('/api', '') + imagePath;
    }
    return imagePath;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="container-fluid">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="dashboard-content">
        <div className="container-fluid">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <div className="container-fluid">
        {/* Page Header */}
        <div className="card shadow-sm border-0 mb-4" style={{ 
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
          borderRadius: '16px',
          padding: '1.5rem 2rem'
        }}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="mb-1 fw-bold text-white" style={{ fontSize: '1.75rem' }}>My Profile</h1>
              <p className="text-white mb-0" style={{ opacity: 0.9 }}>View and manage your profile information</p>
            </div>
            <button
              onClick={() => navigate('/profile/edit')}
              className="btn btn-light d-flex align-items-center gap-2"
              style={{ 
                padding: '0.625rem 1.25rem',
                borderRadius: '8px',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
              }}
            >
              <EditIcon style={{ width: '18px', height: '18px' }} />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        <div className="row g-4">
          {/* Profile Picture Section */}
          <div className="col-lg-4">
            <div className="card shadow-sm border-0" style={{ borderRadius: '16px', overflow: 'hidden' }}>
              <div className="card-body text-center p-4">
                <div className="position-relative d-inline-block mb-3">
                  {(user?.profile_image || user?.image) && !imageError ? (
                    <img
                      src={getImageUrl(user.profile_image || user.image)}
                      alt={user?.name || 'Profile'}
                      className="rounded-circle"
                      style={{
                        width: '150px',
                        height: '150px',
                        objectFit: 'cover',
                        border: '4px solid #2563eb',
                        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)',
                        display: 'block'
                      }}
                      onError={() => {
                        setImageError(true);
                      }}
                    />
                  ) : (
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: '150px',
                        height: '150px',
                        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                        border: '4px solid #2563eb',
                        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)',
                        margin: '0 auto',
                        color: '#ffffff'
                      }}
                    >
                      <span style={{ fontSize: '3rem', fontWeight: '700', color: '#ffffff' }}>
                        {getInitials(user?.name)}
                      </span>
                    </div>
                  )}
                </div>
                <h3 className="fw-bold mb-2" style={{ color: '#1e293b' }}>{user?.name || 'User'}</h3>
                {user?.user_type && (
                  <span className="badge bg-primary mb-3" style={{ 
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {user.user_type}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="col-lg-8">
            <div className="card shadow-sm border-0" style={{ borderRadius: '16px' }}>
              <div className="card-body p-4">
                <h4 className="fw-bold mb-4" style={{ color: '#1e293b' }}>Personal Information</h4>
                
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="d-flex align-items-start gap-3 p-3 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                      <div className="d-flex align-items-center justify-content-center" style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '10px', 
                        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                        flexShrink: 0,
                        color: '#ffffff'
                      }}>
                        <UserIcon style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                      </div>
                      <div className="flex-grow-1">
                        <div className="small text-muted mb-1">Full Name</div>
                        <div className="fw-semibold" style={{ color: '#1e293b' }}>{user?.name || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="d-flex align-items-start gap-3 p-3 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                      <div className="d-flex align-items-center justify-content-center" style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '10px', 
                        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                        flexShrink: 0,
                        color: '#ffffff'
                      }}>
                        <EmailIcon style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                      </div>
                      <div className="flex-grow-1">
                        <div className="small text-muted mb-1">Email Address</div>
                        <div className="fw-semibold" style={{ color: '#1e293b' }}>{user?.email || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="d-flex align-items-start gap-3 p-3 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                      <div className="d-flex align-items-center justify-content-center" style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '10px', 
                        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                        flexShrink: 0,
                        color: '#ffffff'
                      }}>
                        <PhoneIcon style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                      </div>
                      <div className="flex-grow-1">
                        <div className="small text-muted mb-1">Phone Number</div>
                        <div className="fw-semibold" style={{ color: '#1e293b' }}>{user?.phone || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="d-flex align-items-start gap-3 p-3 rounded" style={{ backgroundColor: '#f8f9fa' }}>
                      <div className="d-flex align-items-center justify-content-center" style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '10px', 
                        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                        flexShrink: 0,
                        color: '#ffffff'
                      }}>
                        <CalendarIcon style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                      </div>
                      <div className="flex-grow-1">
                        <div className="small text-muted mb-1">Member Since</div>
                        <div className="fw-semibold" style={{ color: '#1e293b' }}>{formatDate(user?.created_at)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
