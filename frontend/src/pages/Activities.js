import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import { CalendarIcon, MapPinIcon, UsersIcon, CheckIcon, SearchIcon, FilterIcon, ActivitiesIcon, PlusIcon, EditIcon, TrashIcon, EyeIcon, ChevronDownIcon } from '../components/Icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/Activities.css';

const Activities = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, ongoing, completed, upcoming
  const [activeTab, setActiveTab] = useState('my'); // 'my' or 'other'
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isAdmin = user && ((user.user_type && user.user_type.toLowerCase() === 'admin') || Number(user.role) === 0);
  const importInputRef = React.useRef(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  // Activities from API
  const [activities, setActivities] = useState([]);

  // Close search/filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isSearchOpen && !event.target.closest('.search-box') && !event.target.closest('.search-icon-btn')) {
        setIsSearchOpen(false);
      }
      if (isFilterOpen && !event.target.closest('.filter-box') && !event.target.closest('.filter-dropdown') && !event.target.closest('.filter-icon-btn')) {
        setIsFilterOpen(false);
        setIsDropdownOpen(false);
      }
      if (isDropdownOpen && !event.target.closest('.filter-dropdown') && !event.target.closest('.filter-trigger')) {
        setIsDropdownOpen(false);
      }
    };

    if (isSearchOpen || isFilterOpen || isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isSearchOpen, isFilterOpen, isDropdownOpen]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetchUser();
    fetchActivities();
  }, [navigate]);

  const fetchUser = async () => {
    try {
      const response = await api.get('/users/me');
      if (response.data.success) {
        setUser(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await api.get('/activities');
      if (response.data.success) {
        // Map API response to component format
        const mappedActivities = response.data.data.map(activity => {
          // Use API status when provided (includes task-based completion), else compute from dates
          let status = activity.status;
          if (status === undefined || status === null) {
            const startDate = new Date(activity.start_date);
            const endDate = activity.end_date ? new Date(activity.end_date) : null;
            const now = new Date();
            if (endDate && endDate < now) status = 'completed';
            else if (startDate <= now && (!endDate || endDate >= now)) status = 'ongoing';
            else status = 'upcoming';
          }

          return {
            id: activity.id,
            title: activity.title,
            description: activity.description || '',
            date: activity.start_date,
            location: activity.location || '',
            category: activity.category || '',
            organization: activity.organization_name || '',
            volunteers: activity.participant_count || 0,
            maxVolunteers: activity.max_participants || null,
            status,
            progress: status === 'completed' ? 100 : status === 'ongoing' ? 50 : 0,
            is_public: activity.is_public,
            is_joined: activity.is_joined || false,
            created_by: activity.created_by,
            creator_name: activity.creator_name || '',
            creator_user_type: activity.creator_user_type,
            task_hours: activity.task_hours || 0,
            start_date: activity.start_date,
            end_date: activity.end_date
          };
        });
        setActivities(mappedActivities);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Error handling - can add error state if needed
    } finally {
      setLoading(false);
    }
  };

  const handleImportCsvChange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/activities/import-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data?.success) {
        const created = response.data.data?.created_count || 0;
        const errors = response.data.data?.errors || [];
        let msg = `Imported ${created} activities from CSV.`;
        if (errors.length > 0) {
          const firstFew = errors.slice(0, 5).map((e) => `Row ${e.row}: ${e.message}`).join('; ');
          msg += ` ${errors.length} row(s) skipped: ${firstFew}${errors.length > 5 ? '…' : ''}`;
        }
        setImportMessage(msg);
        await fetchActivities();
      } else {
        setImportMessage(response.data?.message || 'Failed to import activities.');
      }
    } catch (error) {
      console.error('Error importing activities CSV:', error);
      setImportMessage(error.response?.data?.message || 'Failed to import activities.');
    } finally {
      setImporting(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleDownloadCsvTemplate = () => {
    const header = [
      'title',
      'description',
      'category',
      'organization_name',
      'location',
      'start_date',
      'end_date',
      'start_time',
      'end_time',
      'max_participants',
      'is_public'
    ].join(',');
    const example = [
      'Community Cleanup',
      'Cleaning local park area',
      'Environment',
      'Volunteer Connect',
      'City Center',
      '20-03-2026',
      '20-03-2026',
      '09:00',
      '17:00',
      '25',
      '1'
    ].join(',');
    const csvContent = `${header}\n${example}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'activities-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ongoing':
        return '#2563eb';
      case 'completed':
        return '#10b981';
      case 'upcoming':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ongoing':
        return 'Ongoing';
      case 'completed':
        return 'Completed';
      case 'upcoming':
        return 'Upcoming';
      default:
        return status;
    }
  };

  const handleDeleteActivity = async (activityId, activityTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${activityTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await api.delete(`/activities/${activityId}`);
      if (response.data.success) {
        // Reload activities after deletion
        await fetchActivities();
      } else {
        alert('Failed to delete activity. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert(error.response?.data?.message || 'Failed to delete activity. Please try again.');
    }
  };

  const handleJoinActivity = async (activityId) => {
    try {
      const response = await api.post(`/activities/${activityId}/join`);
      if (response.data.success) {
        // Reload activities to update join status
        await fetchActivities();
        // Switch to "My Activity" tab to show the joined activity
        setActiveTab('my');
        alert('Successfully joined the activity!');
      } else {
        alert(response.data.message || 'Failed to join activity. Please try again.');
      }
    } catch (error) {
      console.error('Error joining activity:', error);
      alert(error.response?.data?.message || 'Failed to join activity. Please try again.');
    }
  };

  const handleLeaveActivity = async (activityId) => {
    if (!window.confirm('Are you sure you want to leave this activity?')) {
      return;
    }

    try {
      const response = await api.post(`/activities/${activityId}/leave`);
      if (response.data.success) {
        // Reload activities to update join status
        await fetchActivities();
        alert('Successfully left the activity.');
      } else {
        alert(response.data.message || 'Failed to leave activity. Please try again.');
      }
    } catch (error) {
      console.error('Error leaving activity:', error);
      alert(error.response?.data?.message || 'Failed to leave activity. Please try again.');
    }
  };

  // Filter activities based on active tab
  const getTabActivities = () => {
    if (!Array.isArray(activities)) return [];

    if (activeTab === 'my') {
      // My Activity: activities created by user or activities user has joined
      return activities.filter(activity => {
        if (!activity || typeof activity !== 'object') return false;
        const isCreatedByUser = user && user.id && activity.created_by === user.id;
        // Handle both boolean true and number 1 from MySQL
        const isJoined = activity.is_joined === true || activity.is_joined === 1;
        return isCreatedByUser || isJoined;
      });
    } else {
      // Second tab:
      // - Admin: All activities in the platform
      // - Non-admin: Other Activity (public/joinable activities not created by the user)
      if (isAdmin) {
        return activities;
      }

      // Other Activity for non-admins: public activities that user can join
      // Show public activities that:
      // 1. Are public OR created by admin (admin activities are always visible)
      // 2. User hasn't joined
      // 3. Not created by current user
      return activities.filter(activity => {
        if (!activity || typeof activity !== 'object') return false;

        // Check if activity is public (true) or created by admin
        const isPublic = activity.is_public === true || activity.is_public === 1;
        const isCreatedByAdmin = activity.creator_user_type === 'admin' ||
          activity.creator_user_type === 0 ||
          activity.creator_user_type === 'Admin';

        // Must be public OR created by admin (admin activities should always be visible)
        if (!isPublic && !isCreatedByAdmin) return false;

        // User hasn't joined (handle both boolean true and number 1 from MySQL)
        if (activity.is_joined === true || activity.is_joined === 1) return false;

        // Not created by current user (unless current user is admin viewing their own)
        if (user && user.id && activity.created_by === user.id) return false;

        // Show activities created by admins or other users
        return true;
      });
    }
  };

  const filteredActivities = getTabActivities().filter(activity => {
    if (!activity || typeof activity !== 'object') return false;

    // Safely handle null/undefined values
    const title = String(activity.title || '');
    const description = String(activity.description || '');
    const location = String(activity.location || '');
    const searchQueryLower = String(searchQuery || '').toLowerCase();

    const matchesSearch = title.toLowerCase().includes(searchQueryLower) ||
      description.toLowerCase().includes(searchQueryLower) ||
      location.toLowerCase().includes(searchQueryLower);

    const matchesFilter = filterStatus === 'all' || activity.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

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
              <h1 className="mb-1 fw-bold text-white" style={{ fontSize: '1.75rem' }}>Activities</h1>
              <p className="text-white mb-0" style={{ opacity: 0.9 }}>View and manage all your volunteer activities</p>
            </div>
            {activeTab === 'my' && (
              <button
                onClick={() => navigate('/activities/add')}
                className="btn btn-light d-flex align-items-center gap-2"
                style={{ 
                  padding: '0.625rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: '600',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                }}
              >
                <PlusIcon style={{ width: '18px', height: '18px' }} />
                <span>Add Activity</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs and Controls Section */}
        <div className="card shadow-sm border-0 mb-1" style={{ borderRadius: '16px', padding: '1.25rem 1.5rem', overflow: 'visible' }}>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3" style={{ position: 'relative', overflow: 'visible' }}>
            {/* Tabs */}
            <div className="activities-tabs-wrapper">
              <button
                className={`tab-button ${activeTab === 'my' ? 'active' : ''}`}
                onClick={() => setActiveTab('my')}
              >
                My Activity
              </button>
              <button
                className={`tab-button ${activeTab === 'other' ? 'active' : ''}`}
                onClick={() => setActiveTab('other')}
              >
                {isAdmin ? 'All Activities' : 'Other Activity'}
              </button>
            </div>

            {/* Search, Filter, Import */}
            <div className="activities-controls" style={{ position: 'relative', zIndex: 1000 }}>
        <button
          className={`search-icon-btn ${isSearchOpen ? 'active' : ''}`}
          onClick={() => {
            setIsSearchOpen(!isSearchOpen);
            if (!isSearchOpen) setIsFilterOpen(false);
          }}
          title="Search activities"
        >
          <SearchIcon className="search-icon" />
        </button>
        
        <button
          className={`filter-icon-btn ${isFilterOpen ? 'active' : ''}`}
          onClick={() => {
            setIsFilterOpen(!isFilterOpen);
            if (!isFilterOpen) setIsSearchOpen(false);
          }}
          title="Filter activities"
        >
          <FilterIcon className="filter-icon" />
        </button>
        
        {isSearchOpen && (
          <div className={`search-box ${isSearchOpen ? 'open' : ''}`}>
            <SearchIcon className="search-icon" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              autoFocus={isSearchOpen}
            />
          </div>
        )}
        
        {isFilterOpen && (
          <div className={`filter-box ${isFilterOpen ? 'open' : ''}`}>
            <div className="filter-dropdown">
              <button 
                className="filter-trigger"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span className="filter-value">
                  {filterStatus === 'all' && 'All Activities'}
                  {filterStatus === 'upcoming' && 'Upcoming'}
                  {filterStatus === 'ongoing' && 'Ongoing'}
                  {filterStatus === 'completed' && 'Completed'}
                </span>
                <ChevronDownIcon className={`chevron-icon ${isDropdownOpen ? 'open' : ''}`} />
              </button>
              {isDropdownOpen && (
                <div className="filter-options">
                  <button
                    className={`filter-option ${filterStatus === 'all' ? 'active' : ''}`}
                    onClick={() => {
                      setFilterStatus('all');
                      setIsDropdownOpen(false);
                    }}
                  >
                    All Activities
                  </button>
                  <button
                    className={`filter-option ${filterStatus === 'upcoming' ? 'active' : ''}`}
                    onClick={() => {
                      setFilterStatus('upcoming');
                      setIsDropdownOpen(false);
                    }}
                  >
                    Upcoming
                  </button>
                  <button
                    className={`filter-option ${filterStatus === 'ongoing' ? 'active' : ''}`}
                    onClick={() => {
                      setFilterStatus('ongoing');
                      setIsDropdownOpen(false);
                    }}
                  >
                    Ongoing
                  </button>
                  <button
                    className={`filter-option ${filterStatus === 'completed' ? 'active' : ''}`}
                    onClick={() => {
                      setFilterStatus('completed');
                      setIsDropdownOpen(false);
                    }}
                  >
                    Completed
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {isAdmin && (
          <>
            <button
              className="btn btn-sm btn-outline-secondary ms-2"
              type="button"
              onClick={handleDownloadCsvTemplate}
            >
              Download CSV format
            </button>
            <button
              className="btn btn-sm btn-outline-secondary ms-2"
              type="button"
              disabled={importing}
              onClick={() => importInputRef.current && importInputRef.current.click()}
            >
              {importing ? 'Importing…' : 'Import CSV'}
            </button>
            <input
              type="file"
              accept=".csv"
              ref={importInputRef}
              style={{ display: 'none' }}
              onChange={handleImportCsvChange}
            />
          </>
        )}
            </div>
          </div>
        </div>

        {/* Activities List - Table for Desktop, Cards for Mobile */}
        <div className="card shadow-sm border-0" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          <div className="card-body p-0">
      {importMessage && (
        <div className="alert alert-info mx-4 my-3" role="alert">
          {importMessage}
        </div>
      )}
      {filteredActivities.length === 0 ? (
        <div className="activities-empty" style={{ padding: '3rem 2rem', margin: '2rem' }}>
          <ActivitiesIcon className="empty-icon" />
          <h3>No activities found</h3>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="activities-table-wrapper">
            <div className="table-responsive">
              <table className="table table-hover table-striped table-bordered align-middle">
                <thead className="table-dark">
                  <tr>
                    <th scope="col" className="col-4">Activity</th>
                    <th scope="col" className="col-2">Date</th>
                    <th scope="col" className="col-2">Location</th>
                    <th scope="col" className="col-1">Category</th>
                    {isAdmin && activeTab === 'other' && (
                      <th scope="col" className="col-2">Created By</th>
                    )}
                    <th scope="col" className="col-1 text-end">Total Hours</th>
                    <th scope="col" className="col-1">Status</th>
                    <th scope="col" className="col-1 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivities.map((activity) => (
                    <tr key={activity.id}>
                      
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div className="activity-avatar">
                            {activity.title ? activity.title.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <span className="fw-semibold">{activity.title || 'N/A'}</span>
                        </div>
                      </td>
                      <td>
                        <small className="text-muted">
                          {new Date(activity.start_date || activity.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </small>
                      </td>
                      <td>
                        <span className="text-secondary">{activity.location || '-'}</span>
                      </td>
                      <td>
                        {activity.category ? (
                          <span className="badge bg-secondary">{activity.category}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      {isAdmin && activeTab === 'other' && (
                        <td>
                          <span className="text-secondary">
                            {activity.creator_name || `User #${activity.created_by || '-'}`}
                          </span>
                        </td>
                      )}
                      <td className="text-end">
                        {Number(activity.task_hours || 0)} hrs
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            activity.status === 'ongoing' ? 'bg-primary' :
                            activity.status === 'completed' ? 'bg-success' :
                            activity.status === 'upcoming' ? 'bg-warning text-dark' :
                            'bg-secondary'
                          } text-white`}
                        >
                          {getStatusLabel(activity.status)}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-2 justify-content-center align-items-center">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => navigate(`/activities/${activity.id}`)}
                            title="View activity"
                          >
                            <EyeIcon />
                          </button>
                          {/* Join/Leave button for regular users on public activities */}
                          {user && !(user.role === 0 || user.user_type === 'admin') && activity.is_public ? (
                            <>
                              {!activity.is_joined ? (
                                <button
                                  className="btn btn-sm btn-outline-success"
                                  onClick={() => handleJoinActivity(activity.id)}
                                  title="Join activity"
                                >
                                  <PlusIcon />
                                </button>
                              ) : (
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleLeaveActivity(activity.id)}
                                  title="Leave activity"
                                >
                                  <CheckIcon />
                                </button>
                              )}
                            </>
                          ) : null}
                          {/* Show edit/delete buttons only for:
                              - Admins or creators
                              - But NOT in admin \"All Activities\" tab (activeTab === 'other') */}
                          {(user && (user.role === 0 || user.user_type === 'admin' || activity.created_by === user.id) && !(isAdmin && activeTab === 'other')) ? (
                            <>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => navigate(`/activities/${activity.id}/edit`)}
                                title="Edit activity"
                              >
                                <EditIcon />
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteActivity(activity.id, activity.title)}
                                title="Delete activity"
                              >
                                <TrashIcon />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="activities-cards-grid">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="activity-card-mobile">
                <div className="activity-card-mobile-header">
                  <div className="activity-card-mobile-title-section">
                    <div className="activity-card-mobile-title">
                      <div className="activity-card-mobile-avatar">
                        {activity.title ? activity.title.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <span>{activity.title || 'N/A'}</span>
                    </div>
                    <div className="activity-card-mobile-meta">
                      <span
                        className="activity-status-badge"
                        style={{
                          backgroundColor: getStatusColor(activity.status) + '20',
                          color: getStatusColor(activity.status),
                          borderColor: getStatusColor(activity.status)
                        }}
                      >
                        {getStatusLabel(activity.status)}
                      </span>
                      {activity.category && (
                        <span className="category-badge">{activity.category}</span>
                      )}
                    </div>
                  </div>
                </div>

                {activity.description && (
                  <p className="activity-card-mobile-description">{activity.description}</p>
                )}

                <div className="activity-card-mobile-info">
                  <div className="activity-card-mobile-info-item">
                    <CalendarIcon className="activity-card-mobile-info-icon" />
                    <div className="activity-card-mobile-info-content">
                      <span className="activity-card-mobile-info-label">Date</span>
                      <span className="activity-card-mobile-info-value">
                        {new Date(activity.start_date || activity.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {activity.location && (
                    <div className="activity-card-mobile-info-item">
                      <MapPinIcon className="activity-card-mobile-info-icon" />
                      <div className="activity-card-mobile-info-content">
                        <span className="activity-card-mobile-info-label">Location</span>
                        <span className="activity-card-mobile-info-value">{activity.location}</span>
                      </div>
                    </div>
                  )}

                  {/* Number of Volunteers: only show for admin */}
                  {user && (user.role === 0 || user.user_type === 'admin') && (
                    <div className="activity-card-mobile-info-item">
                      <UsersIcon className="activity-card-mobile-info-icon" />
                      <div className="activity-card-mobile-info-content">
                        <span className="activity-card-mobile-info-label">Volunteers</span>
                        <span className="activity-card-mobile-info-value">
                          {activity.volunteers}
                          {activity.maxVolunteers ? ` / ${activity.maxVolunteers}` : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  {activity.organization && (
                    <div className="activity-card-mobile-info-item">
                      <div className="activity-card-mobile-info-content">
                        <span className="activity-card-mobile-info-label">Organization</span>
                        <span className="activity-card-mobile-info-value">{activity.organization}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="activity-card-mobile-actions">
                  <button
                    className="action-btn view-action-btn"
                    onClick={() => navigate(`/activities/${activity.id}`)}
                    title="View activity"
                  >
                    <EyeIcon />
                  </button>
                  {/* Join/Leave button for regular users on public activities */}
                  {user && !(user.role === 0 || user.user_type === 'admin') && activity.is_public ? (
                    <>
                      {!activity.is_joined ? (
                        <button
                          className="action-btn join-action-btn"
                          onClick={() => handleJoinActivity(activity.id)}
                          title="Join activity"
                        >
                          <PlusIcon />
                        </button>
                      ) : (
                        <button
                          className="action-btn leave-action-btn"
                          onClick={() => handleLeaveActivity(activity.id)}
                          title="Leave activity"
                        >
                          <CheckIcon />
                        </button>
                      )}
                    </>
                  ) : null}
                  {/* Show edit/delete buttons only for admins or activity creators */}
                  {user && (user.role === 0 || user.user_type === 'admin' || activity.created_by === user.id) ? (
                    <>
                      <button
                        className="action-btn edit-action-btn"
                        onClick={() => navigate(`/activities/${activity.id}/edit`)}
                        title="Edit activity"
                      >
                        <EditIcon />
                      </button>
                      <button
                        className="action-btn delete-action-btn"
                        onClick={() => handleDeleteActivity(activity.id, activity.title)}
                        title="Delete activity"
                      >
                        <TrashIcon />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </> 
      )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Activities;
