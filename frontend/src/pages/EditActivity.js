import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../config/api';
import { CalendarIcon, MapPinIcon, UsersIcon, CheckIcon, ClockIcon, TagIcon, BuildingIcon, InfoIcon, ArrowLeftIcon } from '../components/Icons';
import '../css/Activities.css';

const EditActivity = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [initialSelectedUsers, setInitialSelectedUsers] = useState([]);
  const [participantUsersMap, setParticipantUsersMap] = useState({}); // Map of user_id to user data for participants
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    organization_name: '',
    location: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    max_participants: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetchUser();
    fetchAllUsers();
    fetchActivity();

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [id, navigate]);

  const fetchUser = async () => {
    try {
      const response = await api.get('/users/me');
      if (response.data.success) {
        setUser(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      navigate('/login');
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await api.get('/users');
      if (response.data.success) {
        const token = localStorage.getItem('token');
        const currentUserData = JSON.parse(localStorage.getItem('user') || '{}');
        const filteredUsers = (response.data.data || []).filter(u => 
          u.is_active && u.id !== currentUserData.id
        );
        setAllUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/activities/${id}`);
      if (response.data.success) {
        const activity = response.data.data;
        
        // Check permission - only admin or creator can edit
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const isAdmin = currentUser.role === 0 || currentUser.user_type === 'admin';
        if (!isAdmin && activity.created_by !== currentUser.id) {
          setErrorMessage('You do not have permission to edit this activity');
          setTimeout(() => {
            navigate(`/activities/${id}`);
          }, 2000);
          return;
        }

        // Parse start_date and end_date to separate date and time
        const startDate = activity.start_date ? new Date(activity.start_date) : null;
        const endDate = activity.end_date ? new Date(activity.end_date) : null;

        setFormData({
          title: activity.title || '',
          description: activity.description || '',
          category: activity.category || '',
          organization_name: activity.organization_name || '',
          location: activity.location || '',
          start_date: startDate ? startDate.toISOString().split('T')[0] : '',
          start_time: startDate ? startDate.toTimeString().slice(0, 5) : '',
          end_date: endDate ? endDate.toISOString().split('T')[0] : '',
          end_time: endDate ? endDate.toTimeString().slice(0, 5) : '',
          max_participants: activity.max_participants || '',
        });

        // Set selected users from existing participants
        if (activity.participants && Array.isArray(activity.participants)) {
          const participantIds = activity.participants.map(p => String(p.user_id || p.id));
          setSelectedUsers(participantIds);
          setInitialSelectedUsers(participantIds);
          
          // Store participant user data for display
          const participantMap = {};
          activity.participants.forEach(p => {
            const userId = String(p.user_id || p.id);
            participantMap[userId] = {
              id: p.user_id || p.id,
              name: p.name,
              email: p.email,
              phone: p.phone
            };
          });
          setParticipantUsersMap(participantMap);
        } else {
          setSelectedUsers([]);
          setInitialSelectedUsers([]);
          setParticipantUsersMap({});
        }
      } else {
        setErrorMessage('Activity not found');
        setTimeout(() => {
          navigate('/activities');
        }, 2000);
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
      if (error.response?.status === 403) {
        setErrorMessage('You do not have permission to edit this activity');
      } else if (error.response?.status === 404) {
        setErrorMessage('Activity not found');
      } else {
        setErrorMessage('Failed to load activity');
      }
      setTimeout(() => {
        navigate('/activities');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});
    setErrorMessage('');
    setSuccessMessage('');

    // Validation
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Activity title is required';
    }
    if (!formData.start_date) {
      errors.start_date = 'Start date is required';
    }
    if (!formData.start_time) {
      errors.start_time = 'Start time is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSubmitting(false);
      return;
    }

    try {
      // Combine date and time for start_date
      let startDateTime = null;
      if (formData.start_date && formData.start_time) {
        startDateTime = new Date(`${formData.start_date}T${formData.start_time}`).toISOString();
      }

      // Combine date and time for end_date
      let endDateTime = null;
      if (formData.end_date && formData.end_time) {
        endDateTime = new Date(`${formData.end_date}T${formData.end_time}`).toISOString();
      } else if (formData.end_date) {
        const endTime = formData.end_time || '23:59';
        endDateTime = new Date(`${formData.end_date}T${endTime}`).toISOString();
      }

      const activityData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category.trim() || null,
        organization_name: formData.organization_name.trim() || null,
        location: formData.location.trim() || null,
        start_date: startDateTime,
        end_date: endDateTime,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
      };

      // Only send participant_ids if user is admin and selections have changed
      if (user && (user.role === 0 || user.user_type === 'admin')) {
        // Check if selectedUsers has changed from initial
        const selectedIds = selectedUsers.map(id => parseInt(id)).sort();
        const initialIds = initialSelectedUsers.map(id => parseInt(id)).sort();
        const hasChanged = JSON.stringify(selectedIds) !== JSON.stringify(initialIds);
        
        if (hasChanged) {
          activityData.participant_ids = selectedIds;
        }
      }

      const response = await api.put(`/activities/${id}`, activityData);

      if (response.data.success) {
        setSuccessMessage('Activity updated successfully!');
        setTimeout(() => {
          navigate(`/activities/${id}`);
        }, 1500);
      } else {
        setErrorMessage(response.data.message || 'Failed to update activity');
      }
    } catch (error) {
      console.error('Error updating activity:', error);
      const errorMsg = error.response?.data?.message || 'Failed to update activity. Please try again.';
      setErrorMessage(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="container-fluid">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
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
              <h1 className="mb-1 fw-bold text-white" style={{ fontSize: '1.75rem' }}>Edit Activity</h1>
              <p className="text-white mb-0" style={{ opacity: 0.9 }}>Update activity details and information</p>
            </div>
            <button
              onClick={() => navigate(`/activities/${id}`)}
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

        {/* Form Card */}
        <div className="card shadow-sm border-0" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          <div className="card-body p-4">
            <form onSubmit={handleSubmit} className="add-activity-form">
              {successMessage && (
                <div className="alert alert-success d-flex align-items-center gap-2 mb-4" role="alert">
                  <CheckIcon style={{ width: '20px', height: '20px' }} />
                  <span>{successMessage}</span>
                </div>
              )}
              {errorMessage && (
                <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
                  <InfoIcon style={{ width: '20px', height: '20px' }} />
                  <span>{errorMessage}</span>
                </div>
              )}

          {/* Basic Information Section */}
          <div className="form-section">
            <h3 className="form-section-title">
              <InfoIcon className="section-icon" />
              Basic Information
            </h3>
            
            <div className="form-row">
              <div className="form-group form-group-full">
                <label htmlFor="title" className="form-label">
                  <span className="label-text">Activity Title</span>
                  <span className="label-required">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Community Cleanup Day"
                  className={`form-input ${formErrors.title ? 'input-error' : ''}`}
                  disabled={submitting}
                />
                {formErrors.title && <span className="error-message">{formErrors.title}</span>}
              </div>
            </div>

            <div className="form-group form-group-full">
              <label htmlFor="description" className="form-label">
                <span className="label-text">Description</span>
              </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the activity, its purpose, and what volunteers will be doing..."
                  rows="3"
                  className={`form-input form-textarea ${formErrors.description ? 'input-error' : ''}`}
                  disabled={submitting}
                />
              {formErrors.description && <span className="error-message">{formErrors.description}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category" className="form-label">
                  <TagIcon className="label-icon" />
                  <span className="label-text">Category</span>
                </label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="e.g., Education, Health, Environment"
                  className={`form-input ${formErrors.category ? 'input-error' : ''}`}
                  disabled={submitting}
                />
                {formErrors.category && <span className="error-message">{formErrors.category}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="organization_name" className="form-label">
                  <BuildingIcon className="label-icon" />
                  <span className="label-text">Organization</span>
                </label>
                <input
                  type="text"
                  id="organization_name"
                  name="organization_name"
                  value={formData.organization_name}
                  onChange={handleInputChange}
                  placeholder="Organization name (optional)"
                  className={`form-input ${formErrors.organization_name ? 'input-error' : ''}`}
                  disabled={submitting}
                />
                {formErrors.organization_name && <span className="error-message">{formErrors.organization_name}</span>}
              </div>
            </div>

            <div className="form-group form-group-full">
              <label htmlFor="location" className="form-label">
                <MapPinIcon className="label-icon" />
                <span className="label-text">Location</span>
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Central Park, 123 Main St, City"
                className={`form-input ${formErrors.location ? 'input-error' : ''}`}
                disabled={submitting}
              />
              {formErrors.location && <span className="error-message">{formErrors.location}</span>}
            </div>
          </div>

          {/* Date & Time Section */}
          <div className="form-section">
            <h3 className="form-section-title">
              <CalendarIcon className="section-icon" />
              Date & Time
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start_date" className="form-label">
                  <CalendarIcon className="label-icon" />
                  <span className="label-text">Start Date</span>
                  <span className="label-required">*</span>
                </label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className={`form-input ${formErrors.start_date ? 'input-error' : ''}`}
                  disabled={submitting}
                />
                {formErrors.start_date && <span className="error-message">{formErrors.start_date}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="start_time" className="form-label">
                  <ClockIcon className="label-icon" />
                  <span className="label-text">Start Time</span>
                  <span className="label-required">*</span>
                </label>
                <input
                  type="time"
                  id="start_time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  className={`form-input ${formErrors.start_time ? 'input-error' : ''}`}
                  disabled={submitting}
                />
                {formErrors.start_time && <span className="error-message">{formErrors.start_time}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="end_date" className="form-label">
                  <CalendarIcon className="label-icon" />
                  <span className="label-text">End Date</span>
                </label>
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  min={formData.start_date || ''}
                  className={`form-input ${formErrors.end_date ? 'input-error' : ''}`}
                  disabled={submitting}
                />
                {formErrors.end_date && <span className="error-message">{formErrors.end_date}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="end_time" className="form-label">
                  <ClockIcon className="label-icon" />
                  <span className="label-text">End Time</span>
                </label>
                <input
                  type="time"
                  id="end_time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  className={`form-input ${formErrors.end_time ? 'input-error' : ''}`}
                  disabled={submitting}
                />
                {formErrors.end_time && <span className="error-message">{formErrors.end_time}</span>}
              </div>
            </div>
          </div>

          {/* Manage Users Section - Admin Only */}
          {user && (user.role === 0 || user.user_type === 'admin') && (
            <div className="form-section">
              <h3 className="form-section-title">
                <UsersIcon className="section-icon" />
                Manage Participants
              </h3>

              <div className="form-group">
                <label className="form-label">
                  <span className="label-text">Select Users</span>
                </label>
                <div className="user-selection-container" ref={userDropdownRef}>
                  <div 
                    className="user-dropdown-trigger"
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  >
                    <input
                      type="text"
                      placeholder={selectedUsers.length > 0 
                        ? `${selectedUsers.length} user(s) selected` 
                        : 'Click to select users...'}
                      value=""
                      readOnly
                      className="user-dropdown-input"
                    />
                    <span className="user-dropdown-arrow">{isUserDropdownOpen ? '▲' : '▼'}</span>
                  </div>

                  {isUserDropdownOpen && (
                    <div className="user-dropdown-menu">
                      <div className="user-search-box">
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="user-search-input"
                          autoFocus
                        />
                      </div>
                      <div className="user-dropdown-list">
                        {allUsers
                          .filter(u => {
                            const searchLower = userSearchQuery.toLowerCase();
                            return u.name.toLowerCase().includes(searchLower) || 
                                   u.email.toLowerCase().includes(searchLower);
                          })
                          .map((u) => {
                            const isSelected = selectedUsers.includes(String(u.id));
                            return (
                              <div
                                key={u.id}
                                className={`user-dropdown-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedUsers(selectedUsers.filter(id => id !== String(u.id)));
                                  } else {
                                    setSelectedUsers([...selectedUsers, String(u.id)]);
                                  }
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="user-checkbox"
                                />
                                <div className="user-item-info">
                                  <span className="user-item-name">{u.name}</span>
                                  <span className="user-item-email">{u.email}</span>
                                  {u.user_type === 'admin' && (
                                    <span className="user-item-badge">Admin</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        {allUsers.filter(u => {
                          const searchLower = userSearchQuery.toLowerCase();
                          return u.name.toLowerCase().includes(searchLower) || 
                                 u.email.toLowerCase().includes(searchLower);
                        }).length === 0 && (
                          <div className="user-dropdown-empty">
                            No users found
                          </div>
                        )}
                      </div>
                      {selectedUsers.length > 0 && (
                        <div className="user-dropdown-footer">
                          {selectedUsers.length} user(s) selected
                        </div>
                      )}
                    </div>
                  )}
                  {selectedUsers.length > 0 && (
                    <div className="selected-users-chips">
                      {selectedUsers.map(userId => {
                        // Try to find user in allUsers first, then in participantUsersMap
                        const user = allUsers.find(u => String(u.id) === userId) || participantUsersMap[userId];
                        if (!user) return null;
                        return (
                          <span key={userId} className="user-chip">
                            {user.name || user.email || userId}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUsers(selectedUsers.filter(id => id !== userId));
                              }}
                              className="user-chip-remove"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

              {/* Additional Details Section - Admin Only */}
              {user && (user.role === 0 || user.user_type === 'admin') && (
                <div className="form-section">
                  <h3 className="form-section-title">
                    <UsersIcon className="section-icon" />
                    Additional Details
                  </h3>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="max_participants" className="form-label">
                        <UsersIcon className="label-icon" />
                        <span className="label-text">Max Participants</span>
                      </label>
                      <input
                        type="number"
                        id="max_participants"
                        name="max_participants"
                        value={formData.max_participants}
                        onChange={handleInputChange}
                        placeholder="Leave empty for unlimited"
                        min="1"
                        className={`form-input ${formErrors.max_participants ? 'input-error' : ''}`}
                        disabled={submitting}
                      />
                      {formErrors.max_participants && <span className="error-message">{formErrors.max_participants}</span>}
                      <small className="form-hint">Leave empty if there's no limit</small>
                    </div>
                  </div>
                </div>
              )}

              <div className="d-flex justify-content-end align-items-center gap-3 mt-5 pt-4 border-top" style={{ borderTop: '2px solid #e5e7eb' }}>
                <button
                  type="button"
                  onClick={() => navigate(`/activities/${id}`)}
                  className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
                  disabled={submitting}
                  style={{ 
                    padding: '0.75rem 2rem',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.9375rem',
                    minWidth: '120px',
                    borderWidth: '2px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    if (!submitting) {
                      e.target.style.backgroundColor = '#f8f9fa';
                      e.target.style.borderColor = '#6c757d';
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!submitting) {
                      e.target.style.backgroundColor = '';
                      e.target.style.borderColor = '';
                      e.target.style.transform = '';
                      e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                    }
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary d-flex align-items-center justify-content-center gap-2"
                  disabled={submitting}
                  style={{ 
                    padding: '0.75rem 2rem',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.9375rem',
                    minWidth: '120px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!submitting) {
                      e.target.style.background = 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.45)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!submitting) {
                      e.target.style.background = 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)';
                      e.target.style.transform = '';
                      e.target.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.35)';
                    }
                  }}
                  onMouseDown={(e) => {
                    if (!submitting) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.3)';
                    }
                  }}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '16px', height: '16px' }}></span>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon style={{ width: '18px', height: '18px', strokeWidth: '2.5' }} />
                      <span>Update Activity</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditActivity;

