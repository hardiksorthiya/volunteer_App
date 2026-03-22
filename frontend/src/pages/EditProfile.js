import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, UserIcon, EmailIcon, PhoneIcon, LockIcon } from '../components/Icons';
import api from '../config/api';

const EditProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [imageError, setImageError] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/me');
      if (response.data.success) {
        const userData = response.data.data;
        setUser(userData);
        setImageError(false);
        setFormData({
          name: userData.name || '',
          phone: userData.phone || ''
        });
        localStorage.setItem('user', JSON.stringify(userData));
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setMessage('');
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
    setPasswordError('');
    setPasswordMessage('');
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      setError('');
      
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/users/me/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const updatedUser = response.data.data;
        setUser(updatedUser);
        setImageError(false);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setMessage('Profile image updated successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(response.data.message || 'Failed to upload image');
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      setSaving(true);
      const response = await api.put('/users/me', {
        name: formData.name,
        phone: formData.phone
      });

      if (response.data.success) {
        const updatedUser = response.data.data;
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setMessage('Profile updated successfully!');
        setTimeout(() => {
          navigate('/profile');
        }, 1500);
      } else {
        setError(response.data.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    try {
      setSaving(true);
      const response = await api.put('/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data.success) {
        setPasswordMessage('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => {
          setShowPasswordForm(false);
          setPasswordMessage('');
        }, 2000);
      } else {
        setPasswordError(response.data.message || 'Failed to change password');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
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
              <h1 className="mb-1 fw-bold text-white" style={{ fontSize: '1.75rem' }}>Edit Profile</h1>
              <p className="text-white mb-0" style={{ opacity: 0.9 }}>Update your profile information</p>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="btn btn-light d-flex align-items-center gap-2"
              style={{ 
                padding: '0.625rem 1.25rem',
                borderRadius: '8px',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
              }}
            >
              <ArrowLeftIcon style={{ width: '18px', height: '18px' }} />
              <span>Back</span>
            </button>
          </div>
        </div>

        <div className="row g-4">
          {/* Profile Picture Section */}
          <div className="col-lg-4">
            <div className="card shadow-sm border-0" style={{ borderRadius: '16px', overflow: 'hidden' }}>
              <div className="card-body text-center p-4">
                <div className="position-relative d-inline-block mb-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
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
                        cursor: 'pointer',
                        display: 'block'
                      }}
                      onClick={handleImageClick}
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
                        cursor: 'pointer'
                      }}
                      onClick={handleImageClick}
                    >
                      <span style={{ fontSize: '3rem', fontWeight: '700', color: '#ffffff' }}>
                        {getInitials(user?.name)}
                      </span>
                    </div>
                  )}
                  {uploadingImage && (
                    <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center rounded-circle" style={{
                      background: 'rgba(0, 0, 0, 0.5)',
                      zIndex: 10,
                      borderRadius: '50%'
                    }}>
                      <div className="spinner-border text-white" role="status">
                        <span className="visually-hidden">Uploading...</span>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleImageClick}
                  className="btn btn-primary btn-sm"
                  disabled={uploadingImage}
                  style={{ borderRadius: '8px' }}
                >
                  {uploadingImage ? 'Uploading...' : 'Change Photo'}
                </button>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="col-lg-8">
            <div className="card shadow-sm border-0" style={{ borderRadius: '16px' }}>
              <div className="card-body p-4">
                {error && (
                  <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError('')}></button>
                  </div>
                )}
                {message && (
                  <div className="alert alert-success alert-dismissible fade show" role="alert">
                    {message}
                    <button type="button" className="btn-close" onClick={() => setMessage('')}></button>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="form-label fw-semibold d-flex align-items-center gap-2 mb-2" style={{ color: '#1e293b' }}>
                      <div className="d-flex align-items-center justify-content-center" style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '8px', 
                        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                        flexShrink: 0,
                        color: '#ffffff'
                      }}>
                        <UserIcon style={{ width: '16px', height: '16px', color: '#ffffff' }} />
                      </div>
                      <span style={{ color: '#1e293b' }}>Full Name</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="form-control"
                      style={{ borderRadius: '10px', padding: '0.75rem 1rem' }}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold d-flex align-items-center gap-2 mb-2" style={{ color: '#1e293b' }}>
                      <div className="d-flex align-items-center justify-content-center" style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '8px', 
                        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                        flexShrink: 0,
                        color: '#ffffff'
                      }}>
                        <EmailIcon style={{ width: '16px', height: '16px', color: '#ffffff' }} />
                      </div>
                      <span style={{ color: '#1e293b' }}>Email Address</span>
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      className="form-control"
                      style={{ borderRadius: '10px', padding: '0.75rem 1rem', backgroundColor: '#f8f9fa' }}
                      disabled
                    />
                    <small className="text-muted">Email cannot be changed</small>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold d-flex align-items-center gap-2 mb-2" style={{ color: '#1e293b' }}>
                      <div className="d-flex align-items-center justify-content-center" style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '8px', 
                        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                        flexShrink: 0,
                        color: '#ffffff'
                      }}>
                        <PhoneIcon style={{ width: '16px', height: '16px', color: '#ffffff' }} />
                      </div>
                      <span style={{ color: '#1e293b' }}>Phone Number</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="form-control"
                      style={{ borderRadius: '10px', padding: '0.75rem 1rem' }}
                    />
                  </div>

                  <div className="d-flex gap-3 justify-content-end">
                    <button
                      type="button"
                      onClick={() => navigate('/profile')}
                      className="btn btn-outline-secondary"
                      style={{ 
                        minWidth: '120px',
                        padding: '0.75rem 2rem',
                        borderRadius: '10px',
                        fontWeight: '600'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                      style={{ 
                        minWidth: '120px',
                        padding: '0.75rem 2rem',
                        borderRadius: '10px',
                        fontWeight: '600',
                        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                        border: 'none'
                      }}
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </form>

                {/* Password Change Section */}
                <div className="mt-5 pt-4 border-top">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold mb-0 d-flex align-items-center gap-2" style={{ color: '#1e293b' }}>
                      <div className="d-flex align-items-center justify-content-center" style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '8px', 
                        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                        flexShrink: 0,
                        color: '#ffffff'
                      }}>
                        <LockIcon style={{ width: '16px', height: '16px', color: '#ffffff' }} />
                      </div>
                      <span style={{ color: '#1e293b' }}>Change Password</span>
                    </h5>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordForm(!showPasswordForm);
                        setPasswordError('');
                        setPasswordMessage('');
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                      }}
                      className="btn btn-outline-primary btn-sm"
                      style={{ borderRadius: '8px' }}
                    >
                      {showPasswordForm ? 'Cancel' : 'Change Password'}
                    </button>
                  </div>

                  {showPasswordForm && (
                    <form onSubmit={handlePasswordSubmit}>
                      {passwordError && (
                        <div className="alert alert-danger alert-dismissible fade show" role="alert">
                          {passwordError}
                          <button type="button" className="btn-close" onClick={() => setPasswordError('')}></button>
                        </div>
                      )}
                      {passwordMessage && (
                        <div className="alert alert-success alert-dismissible fade show" role="alert">
                          {passwordMessage}
                          <button type="button" className="btn-close" onClick={() => setPasswordMessage('')}></button>
                        </div>
                      )}

                      <div className="mb-3">
                        <label className="form-label fw-semibold">Current Password</label>
                        <input
                          type="password"
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className="form-control"
                          style={{ borderRadius: '10px', padding: '0.75rem 1rem' }}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label fw-semibold">New Password</label>
                        <input
                          type="password"
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className="form-control"
                          style={{ borderRadius: '10px', padding: '0.75rem 1rem' }}
                          required
                          minLength={6}
                        />
                        <small className="text-muted">Must be at least 6 characters long</small>
                      </div>

                      <div className="mb-3">
                        <label className="form-label fw-semibold">Confirm New Password</label>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className="form-control"
                          style={{ borderRadius: '10px', padding: '0.75rem 1rem' }}
                          required
                        />
                      </div>

                      <div className="d-flex justify-content-end">
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={saving}
                          style={{ 
                            minWidth: '120px',
                            padding: '0.75rem 2rem',
                            borderRadius: '10px',
                            fontWeight: '600',
                            background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                            border: 'none'
                          }}
                        >
                          {saving ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                              Changing...
                            </>
                          ) : (
                            'Change Password'
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
