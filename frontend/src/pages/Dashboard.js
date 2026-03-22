import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import { EditIcon, UserIcon, EyeIcon, EyeOffIcon, LockIcon, CalendarIcon, CheckIcon, MapPinIcon, PlusIcon, TrashIcon } from '../components/Icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/Dashboard.css';

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

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = React.useRef(null);
  const [activeTab, setActiveTab] = useState('my'); // 'my' or 'history'
  const [userActivities, setUserActivities] = useState([]);
  const [myActivities, setMyActivities] = useState([]);
  const [stats, setStats] = useState({
    myActivities: 0,
    completedActivities: 0,
    totalHours: 0,
    totalTasks: 0
  });
  const [categoryData, setCategoryData] = useState([]);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [taskHoursData, setTaskHoursData] = useState([]);
  const [dateFilter, setDateFilter] = useState('last_week'); // 'last_week', 'last_month', 'last_year', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loadingTaskHours, setLoadingTaskHours] = useState(false);
  const [taskHoursDateRange, setTaskHoursDateRange] = useState(null);
  const [userTasks, setUserTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [hourTargetProgress, setHourTargetProgress] = useState(null);
  const [hourTargetActivityData, setHourTargetActivityData] = useState([]);
  const [loadingHourTargetActivityData, setLoadingHourTargetActivityData] = useState(false);
  const [showHourTargetModal, setShowHourTargetModal] = useState(false);
  const [hourTargetForm, setHourTargetForm] = useState({ startDate: '', endDate: '', hours: '' });
  const [savingHourTarget, setSavingHourTarget] = useState(false);
  const [deletingHourTarget, setDeletingHourTarget] = useState(false);

  // Detect admin from user or localStorage (so scope=personal works before user state is set)
  const getIsAdmin = (u) => {
    if (!u) {
      try {
        const stored = localStorage.getItem('user');
        if (stored) u = JSON.parse(stored);
      } catch (e) {
        return false;
      }
    }
    if (!u) return false;
    const role = u.role != null ? Number(u.role) : NaN;
    const userType = u.user_type ? String(u.user_type).toLowerCase() : '';
    return role === 0 || userType === 'admin';
  };

  const extractYMD = (value) => {
    if (!value) return '';
    const s = String(value);
    const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : s;
  };

  const formatDMY = (value) => {
    const ymd = extractYMD(value);
    const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return ymd;
    const [, y, mo, d] = m;
    return `${d}-${mo}-${y}`;
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetchUser();
    fetchUserActivities();
    fetchUserTasks();
  }, [navigate]);

  // Refetch activities and stats when user returns to Dashboard (e.g. after completing a task on Activity Detail)
  useEffect(() => {
    const handleFocus = () => {
      fetchUserActivities();
      fetchUserTasks();
      fetchHourTargetProgress();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) fetchHourTargetProgress();
  }, []);

  useEffect(() => {
    fetchTaskHoursByActivity();
  }, [dateFilter, customStartDate, customEndDate, user?.id]);

  useEffect(() => {
    if (
      hourTargetProgress?.target_hours == null ||
      !hourTargetProgress?.target_start_date ||
      !hourTargetProgress?.target_end_date
    ) {
      setHourTargetActivityData([]);
      return;
    }
    fetchHourTargetHoursByActivity(hourTargetProgress.target_start_date, hourTargetProgress.target_end_date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hourTargetProgress?.target_start_date, hourTargetProgress?.target_end_date]);

  const fetchUser = async () => {
    try {
      setImageError(false);
      const response = await api.get('/users/me');
      if (response.data.success) {
        setUser(response.data.data);
        setFormData({
          name: response.data.data.name || '',
          phone: response.data.data.phone || '',
          email: response.data.data.email || ''
        });
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserActivities = async () => {
    try {
      // Get user first if not available
      let currentUser = user;
      if (!currentUser) {
        try {
          const userResponse = await api.get('/users/me');
          if (userResponse.data.success) {
            currentUser = userResponse.data.data;
            setUser(currentUser);
          }
        } catch (err) {
          console.error('Error fetching user:', err);
        }
      }
      
      // Dashboard = individual only. For admin use personal_created (only activities/tasks/hours I created, no joined users).
      const isAdmin = getIsAdmin(currentUser);
      const scopeParam = isAdmin ? '?scope=personal_created' : '';
      const [activitiesResponse, totalHoursResponse, completedResponse, myActivitiesResponse, totalTasksResponse] = await Promise.all([
        api.get('/activities'),
        api.get(`/activities/stats/total-hours${scopeParam}`),
        api.get(`/activities/stats/completed${scopeParam}`),
        api.get(`/activities/stats/my-activities${scopeParam}`),
        api.get(`/activities/stats/total-tasks${scopeParam}`)
      ]);

      if (activitiesResponse.data.success) {
        const activities = activitiesResponse.data.data || [];
        const currentUserId = currentUser?.id;

        // For admin individual: only activities created by me (no joined). For volunteer: created/joined/has tasks.
        const myCreatedActivitiesList = currentUserId && isAdmin
          ? activities.filter(a => a.created_by === currentUserId)
          : [];
        const myActivitiesList = currentUserId
          ? activities.filter(a => {
            if (a.created_by === currentUserId) return true;
            if (a.is_joined === true || a.is_joined === 1 || a.is_joined === '1') return true;
            if (a.has_tasks === true || a.has_tasks === 1 || a.has_tasks === '1') return true;
            if (a.task_hours && parseFloat(a.task_hours) > 0) return true;
            return false;
          })
          : [];

        const activitiesToShow = isAdmin ? myCreatedActivitiesList : activities;
        setUserActivities(activitiesToShow);
        setMyActivities(myActivitiesList);

        const myAllCount = isAdmin
          ? myCreatedActivitiesList.length
          : (myActivitiesResponse.data?.success ? myActivitiesResponse.data.data.my_activities : myActivitiesList.length);
        const myCompletedCount = isAdmin
          ? myCreatedActivitiesList.filter(a => a.status === 'completed').length
          : (completedResponse.data?.success ? completedResponse.data.data.completed_activities : 0);

        const totalHours = totalHoursResponse.data?.success ? totalHoursResponse.data.data.total_hours : 0;
        const totalTasks = totalTasksResponse.data?.success ? totalTasksResponse.data.data.total_tasks : 0;

        setStats({
          myActivities: myAllCount,
          completedActivities: myCompletedCount,
          totalHours: totalHours,
          totalTasks: totalTasks
        });

        // Category distribution from the same activities we show (individual for admin)
        const categoryCounts = {};
        activitiesToShow.forEach(activity => {
          const category = activity.category || 'Uncategorized';
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });

        const categoryDataArray = Object.entries(categoryCounts).map(([name, value]) => ({
          name,
          value
        }));

        setCategoryData(categoryDataArray);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchTaskHoursByActivity = async () => {
    setLoadingTaskHours(true);
    try {
      let url = '/activities/stats/task-hours-by-activity?';
      if (dateFilter === 'custom' && customStartDate && customEndDate) {
        url += `start_date=${customStartDate}&end_date=${customEndDate}`;
      } else {
        url += `period=${dateFilter}`;
      }
      // Dashboard = individual only. Admin gets personal_created (only my created activities/tasks).
      if (getIsAdmin(user)) url += '&scope=personal_created';

      console.log('🔍 Fetching task hours with URL:', url);
      const response = await api.get(url);
      console.log('📊 Task hours response:', response.data);
      
      if (response.data.success) {
        const data = response.data.data.task_hours_by_activity || [];
        const dateRange = response.data.data.date_range;
        console.log('📊 Task hours data:', data);
        console.log('📅 Date range:', dateRange);
        setTaskHoursData(data);
        setTaskHoursDateRange(dateRange);
      } else {
        console.warn('⚠️ API returned success: false', response.data);
        setTaskHoursData([]);
        setTaskHoursDateRange(null);
      }
    } catch (error) {
      console.error('❌ Error fetching task hours by activity:', error);
      console.error('❌ Error details:', error.response?.data);
      setTaskHoursData([]);
      setTaskHoursDateRange(null);
    } finally {
      setLoadingTaskHours(false);
    }
  };

  const fetchUserTasks = async () => {
    setLoadingTasks(true);
    try {
      const response = await api.get('/activities/tasks/my-tasks');
      console.log('📋 User tasks response:', response.data);
      
      if (response.data.success) {
        setUserTasks(response.data.data || []);
      } else {
        console.warn('⚠️ API returned success: false', response.data);
        setUserTasks([]);
      }
    } catch (error) {
      console.error('❌ Error fetching user tasks:', error);
      console.error('❌ Error details:', error.response?.data);
      setUserTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchHourTargetProgress = async () => {
    try {
      const response = await api.get('/users/me/hour-target-progress');
      if (response.data.success) {
        setHourTargetProgress(response.data.data);
      } else {
        setHourTargetProgress(null);
      }
    } catch (error) {
      console.error('Error fetching hour target progress:', error);
      setHourTargetProgress(null);
    }
  };

  const fetchHourTargetHoursByActivity = async (startDate, endDate) => {
    setLoadingHourTargetActivityData(true);
    try {
      if (!startDate || !endDate) {
        setHourTargetActivityData([]);
        return;
      }

      const scopeParam = getIsAdmin(user) ? '&scope=personal_created' : '';
      const response = await api.get(`/activities/stats/task-hours-by-activity?start_date=${startDate}&end_date=${endDate}${scopeParam}`);
      const rows = response.data?.success ? (response.data.data?.task_hours_by_activity || []) : [];
      setHourTargetActivityData(rows);
    } catch (error) {
      console.error('Error fetching hour target hours by activity:', error);
      setHourTargetActivityData([]);
    } finally {
      setLoadingHourTargetActivityData(false);
    }
  };

  const handleOpenHourTargetModal = () => {
    const startDate = extractYMD(hourTargetProgress?.target_start_date || user?.hour_target_start_date || '');
    const endDate = extractYMD(hourTargetProgress?.target_end_date || user?.hour_target_end_date || '');
    const hoursRaw =
      (user?.hour_target_hours ?? hourTargetProgress?.target_hours ?? '') !== ''
        ? (user?.hour_target_hours ?? hourTargetProgress?.target_hours)
        : '';
    const hours = hoursRaw !== '' ? String(hoursRaw) : '';

    setHourTargetForm({ startDate, endDate, hours });
    setShowHourTargetModal(true);
  };

  const handleSaveHourTarget = async () => {
    const hoursNum = hourTargetForm.hours === '' ? null : parseInt(hourTargetForm.hours, 10);
    if (hoursNum !== null && (isNaN(hoursNum) || hoursNum < 0)) {
      alert('Please enter a valid non-negative number of hours.');
      return;
    }

    const startDate = hourTargetForm.startDate;
    const endDate = hourTargetForm.endDate;

    // Leave hours empty to clear the target.
    if (hoursNum === null) {
      await handleDeleteHourTarget();
      setShowHourTargetModal(false);
      return;
    }
    if (!startDate || !endDate) {
      alert('Please select a start date and an end date.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      alert('Start date must be before or equal to end date.');
      return;
    }

    setSavingHourTarget(true);
    try {
      await api.put('/users/me', {
        hour_target_start_date: startDate,
        hour_target_end_date: endDate,
        hour_target_hours: hoursNum
      });
      const userRes = await api.get('/users/me');
      if (userRes.data.success) setUser(userRes.data.data);
      await fetchHourTargetProgress();
      setShowHourTargetModal(false);
    } catch (error) {
      console.error('Error saving hour target:', error);
      alert(error.response?.data?.message || 'Failed to save target.');
    } finally {
      setSavingHourTarget(false);
    }
  };

  const handleDeleteHourTarget = async () => {
    setDeletingHourTarget(true);
    try {
      await api.delete('/users/me/hour-target');
      const userRes = await api.get('/users/me');
      if (userRes.data.success) setUser(userRes.data.data);
      await fetchHourTargetProgress();
      setHourTargetForm({ startDate: '', endDate: '', hours: '' });
      setShowHourTargetModal(false);
    } catch (error) {
      console.error('Error deleting hour target:', error);
      alert(error.response?.data?.message || 'Failed to delete target.');
    } finally {
      setDeletingHourTarget(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleEdit = () => {
    setEditing(true);
    setError('');
    setMessage('');
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      name: user?.name || '',
      phone: user?.phone || '',
      email: user?.email || ''
    });
    setError('');
    setMessage('');
  };

  const handlePasswordCancel = () => {
    setShowPasswordForm(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError('');
    setPasswordMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const response = await api.put('/users/me', {
        name: formData.name,
        phone: formData.phone
      });
      if (response.data.success) {
        setUser(response.data.data);
        setMessage('Profile updated successfully!');
        setEditing(false);
        localStorage.setItem('user', JSON.stringify(response.data.data));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
    setPasswordError('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    try {
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
        // Hide form after successful password change
        setTimeout(() => {
          setShowPasswordForm(false);
          setPasswordMessage('');
        }, 2000);
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleAvatarClick = () => {
    if (!uploadingImage && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large. Please choose an image smaller than 5MB.');
      return;
    }

    e.target.value = '';
    await uploadImage(file);
  };

  const uploadImage = async (file) => {
    try {
      setUploadingImage(true);
      setError('');
      setImageError(false);

      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/users/me/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      if (response.data && response.data.success) {
        let imageUrl = response.data.data?.image ||
          response.data.data?.profile_image ||
          response.data.data?.image_url ||
          response.data.image;

        const urlParts = imageUrl.split('?');
        const baseUrl = urlParts[0];
        const existingParams = urlParts[1] ? urlParts[1].split('&').filter(p => !p.startsWith('v=')).join('&') : '';
        const separator = existingParams ? '&' : '?';
        imageUrl = `${baseUrl}${existingParams ? '?' + existingParams + separator : separator}v=${Date.now()}`;

        const updatedUser = { ...user, image: imageUrl, profile_image: imageUrl };
        setUser(updatedUser);
        setMessage('Profile image updated successfully!');
        setImageError(false);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        throw new Error(response.data?.message || 'Failed to upload image');
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      let errorMessage = 'Failed to upload image. Please try again.';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 404) {
        errorMessage = 'Upload endpoint not found. Please check if the server supports image uploads.';
      } else if (err.response?.status === 413) {
        errorMessage = 'Image file is too large. Please choose a smaller image.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    return `${day} ${month}`;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDateRange = (startDate, endDate) => {
    if (!startDate) return 'N/A';
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    const startFormatted = formatDate(startDate);
    const endFormatted = end ? formatDate(endDate) : null;

    if (endFormatted && startFormatted !== endFormatted) {
      return `${startFormatted} - ${endFormatted}`;
    }
    return startFormatted;
  };

  const handleJoinActivity = async (activityId) => {
    try {
      const response = await api.post(`/activities/${activityId}/join`);
      if (response.data.success) {
        // Update activity state optimistically
        setUserActivities(prev => prev.map(activity =>
          activity.id === activityId
            ? { ...activity, is_joined: true }
            : activity
        ));
        setMyActivities(prev => prev.map(activity =>
          activity.id === activityId
            ? { ...activity, is_joined: true }
            : activity
        ));
        // Refresh activities to get updated data
        fetchUserActivities();
      }
    } catch (error) {
      console.error('Error joining activity:', error);
      alert(error.response?.data?.message || 'Failed to join activity');
    }
  };

  const handleLeaveActivity = async (activityId) => {
    try {
      const response = await api.post(`/activities/${activityId}/leave`);
      if (response.data.success) {
        // Update activity state optimistically
        setUserActivities(prev => prev.map(activity =>
          activity.id === activityId
            ? { ...activity, is_joined: false }
            : activity
        ));
        setMyActivities(prev => prev.map(activity =>
          activity.id === activityId
            ? { ...activity, is_joined: false }
            : activity
        ));
        // Refresh activities to get updated data
        fetchUserActivities();
      }
    } catch (error) {
      console.error('Error leaving activity:', error);
      alert(error.response?.data?.message || 'Failed to leave activity');
    }
  };

  const handleViewActivity = (activityId) => {
    navigate(`/activities/${activityId}`);
  };

  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="container-fluid">
          <div className="d-flex justify-content-center align-items-center" style={{ padding: '2rem 0' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getRoleLabel = () => {
    if (!user) return 'Volunteer';
    if (user.user_type === 'admin') return 'Admin';
    if (user.user_type === 'organization') return 'Organization';
    return 'Volunteer';
  };

  // For admin individual: Total Hour card matches "My hour target" (current period hours) when set
  const displayTotalHours =
    getIsAdmin(user) &&
    hourTargetProgress?.target_hours != null &&
    hourTargetProgress?.target_start_date &&
    hourTargetProgress?.target_end_date &&
    hourTargetProgress?.current_range_hours != null
      ? hourTargetProgress.current_range_hours
      : stats.totalHours;

  return (
    <div className="dashboard-content">
      <div className="container-fluid">
        <div className="row g-3">
        {/* Left Side - Statistics and History */}
        <div className="col-xl-8 col-lg-12 col-md-12 col-sm-12">
          {/* Statistics Cards */}
          <div className="stats-cards">
            <div className="stat-card stat-all">
              <div className="stat-content">
                <div className="stat-number">{stats.myActivities}</div>
                <div className="stat-label">My Activity</div>
                <div className="stat-percentage">
                  {stats.myActivities > 0 ? '100%' : '0%'}
                </div>
              </div>
              <div className="stat-chart">
                <div className="chart-bar" style={{ height: `${Math.min((stats.myActivities / Math.max(stats.myActivities, 1)) * 100, 100)}%` }}></div>
              </div>
            </div>

            <div className="stat-card stat-completed">
              <div className="stat-content">
                <div className="stat-number">{stats.completedActivities}</div>
                <div className="stat-label">Completed Activity</div>
                <div className="stat-percentage">
                  {stats.myActivities > 0 ? ((stats.completedActivities / stats.myActivities) * 100).toFixed(1) : 0}%
                </div>
              </div>
              <div className="stat-chart">
                <div className="chart-bar" style={{ height: `${stats.myActivities > 0 ? (stats.completedActivities / stats.myActivities) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div className="stat-card stat-cancelled">
              <div className="stat-content">
                <div className="stat-number">{displayTotalHours}</div>
                <div className="stat-label">Total Hour</div>
                <div className="stat-percentage">
                  {stats.completedActivities > 0 ? (displayTotalHours / stats.completedActivities).toFixed(1) : 0} hrs/activity
                </div>
              </div>
              <div className="stat-chart">
                <div className="chart-bar" style={{ height: `${displayTotalHours > 0 ? Math.min((displayTotalHours / 100) * 100, 100) : 0}%` }}></div>
              </div>
            </div>

            <div className="stat-card stat-tasks">
              <div className="stat-content">
                <div className="stat-number">{stats.totalTasks}</div>
                <div className="stat-label">Total Task</div>
                <div className="stat-percentage">
                  {stats.myActivities > 0 ? (stats.totalTasks / stats.myActivities).toFixed(1) : 0} tasks/activity
                </div>
              </div>
              <div className="stat-chart">
                <div className="chart-bar" style={{ height: `${stats.totalTasks > 0 ? Math.min((stats.totalTasks / Math.max(stats.totalTasks, 1)) * 100, 100) : 0}%` }}></div>
              </div>
            </div>
          </div>

          {/* My Hour Target - progress vs target */}
          <div className="hour-target-card">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">My hour target</h5>
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={handleOpenHourTargetModal}>
                {hourTargetProgress?.target_hours != null && hourTargetProgress?.target_start_date && hourTargetProgress?.target_end_date ? 'Edit target' : 'Set target'}
              </button>
            </div>
            {hourTargetProgress?.target_hours != null && hourTargetProgress?.target_start_date && hourTargetProgress?.target_end_date ? (
              <>
                <p className="text-muted small mb-2">
                  {`${formatDMY(hourTargetProgress.target_start_date)} - ${formatDMY(hourTargetProgress.target_end_date)}`}
                </p>
                {(() => {
                  const current = hourTargetProgress.current_range_hours ?? 0;
                  const target = hourTargetProgress.target_hours;
                  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
                  return (
                    <>
                      <div className="d-flex justify-content-between align-items-baseline mb-1">
                        <span className="fw-bold">{current} / {target} hours</span>
                        <span className="text-muted">{pct}%</span>
                      </div>
                      <div className="progress" style={{ height: '10px' }}>
                        <div
                          className="progress-bar bg-success"
                          role="progressbar"
                          style={{ width: `${pct}%` }}
                          aria-valuenow={current}
                          aria-valuemin={0}
                          aria-valuemax={target}
                        />
                      </div>
                    </>
                  );
                })()}

                <div className="mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-semibold">Hours by activity</span>
                    <span className="text-muted small">
                      Selected range
                    </span>
                  </div>
                  {loadingHourTargetActivityData ? (
                    <div className="text-muted small">Loading…</div>
                  ) : hourTargetActivityData.length > 0 ? (
                    <div style={{ width: '100%', height: 240 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={hourTargetActivityData.map(r => ({ name: r.activity_title, value: Number(r.total_hours) || 0 }))}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                          >
                            {hourTargetActivityData.map((_, index) => {
                              const colors = ['#2563eb', '#8b5cf6', '#f97316', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];
                              return <Cell key={`cell-ht-${index}`} fill={colors[index % colors.length]} />;
                            })}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} hours`, 'Total Hours']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-muted small">No hours recorded for this period.</div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted small mb-0">
                Set a date-range volunteer hour target and track your progress here.
              </p>
            )}
          </div>

          {/* Work History Section */}
          <div className="work-history-card">
            <div className="history-tabs">
              <button
                className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`}
                onClick={() => setActiveTab('my')}
              >
                My Activities ({myActivities.length})
              </button>
              <button
                className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                Work History
              </button>
            </div>

            <div className="tab-content">
          {activeTab === 'my' ? (
                <div className="activities-list">
                  {myActivities.length === 0 ? (
                    <div className="empty-state">
                      <p>You haven't created or joined any activities yet</p>
                      <button onClick={() => navigate('/activities/add')} className="add-activity-link">
                        Create Your First Activity
                      </button>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover table-striped align-middle">
                        <thead className="table-primary">
                          <tr>
                            <th>Activity Name</th>
                            <th>Date</th>
                            <th>Location</th>
                            <th className="text-end">Total Hours</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myActivities.slice(0, 10).map((activity) => (
                            <tr key={activity.id}>
                              <td>
                                <strong>{activity.title || 'Activity'}</strong>
                              </td>
                              <td>
                                {formatDateRange(activity.start_date, activity.end_date)}
                              </td>
                              <td>
                                {activity.location || activity.address || 'N/A'}
                              </td>
                              <td className="text-end fw-semibold">
                                {Number(activity.task_hours || 0)} hrs
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="work-history-content">
                  {loadingTasks ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="text-muted mt-2">Loading tasks...</p>
                    </div>
                  ) : userTasks.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover table-striped align-middle">
                        <thead className="table-primary">
                          <tr>
                            <th>Task Name</th>
                            <th>Activity</th>
                            <th>Date</th>
                            <th>Hours</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userTasks.map((task) => (
                            <tr key={task.id}>
                              <td>
                                <strong>{task.title || 'Task'}</strong>
                              </td>
                              <td>
                                {task.activity_title || 'N/A'}
                              </td>
                              <td>
                                {task.due_date 
                                  ? formatDateRange(task.start_date, task.due_date)
                                  : task.start_date 
                                  ? formatDate(task.start_date)
                                  : 'N/A'}
                              </td>
                              <td>
                                {task.total_hours ? `${task.total_hours} hrs` : 'N/A'}
                              </td>
                              <td>
                                <span className={`status-badge status-${task.status || 'pending'}`}>
                                  {task.status ? task.status.replace('-', ' ') : 'pending'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="history-placeholder">
                      <p>No tasks found</p>
                      <p className="placeholder-subtitle">You haven't created or been assigned any tasks yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Pie Chart and Activities List */}
        <div className="col-xl-4 col-lg-12 col-md-12 col-sm-12">
          {/* Category Pie Chart */}
          <div className="card shadow-sm mb-4 dashboard-chart-card">
            <div className="card-body dashboard-chart-body">
              <h5 className="card-title mb-3">Activity Categories</h5>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250} className="pie-chart-container">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => {
                        const COLORS = ['#2563eb', '#8b5cf6', '#f97316', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];
                        return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                      })}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5">
                  <p className="text-muted">No activities with categories found</p>
                </div>
              )}
            </div>
          </div>

          {/* Task Hours Bar Chart */}
          <div className="card shadow-sm dashboard-chart-card">
            <div className="card-body dashboard-chart-body">
              <div className="d-flex justify-content-between align-items-center mb-3 dashboard-chart-header">
                <h5 className="card-title mb-0">Task Hours by Activity</h5>
                
                {/* Date Filter Dropdown */}
                <div className="dashboard-time-filter">
                  <select
                    className="form-select form-select-sm"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  >
                    <option value="last_week">Last 7 Days</option>
                    <option value="last_month">Last Month</option>
                    <option value="last_year">Last Year</option>
                    <option value="custom">Custom Date</option>
                  </select>
                </div>
              </div>
              
              {/* Date Range Display */}
              {taskHoursDateRange && (
                <div className="mb-2">
                  <small className="text-muted">
                    {taskHoursDateRange.start_date} to {taskHoursDateRange.end_date}
                  </small>
                </div>
              )}

              {/* Custom Date Inputs */}
              {dateFilter === 'custom' && (
                <div className="mb-3 row g-2">
                  <div className="col-6">
                    <label className="form-label small">Start Date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small">End Date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Bar Chart */}
              {loadingTaskHours ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted mt-2">Loading task hours data...</p>
                </div>
              ) : taskHoursData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={taskHoursData} margin={{ top: 5, right: 5, left: 5, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="activity_title" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis 
                      label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value} hours`, 'Total Hours']}
                      labelFormatter={(label) => `Activity: ${label}`}
                    />
                    <Bar dataKey="total_hours" fill="#2563eb" radius={[4, 4, 0, 0]}>
                      {taskHoursData.map((entry, index) => {
                        const colors = ['#2563eb', '#8b5cf6', '#f97316', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5">
                  <p className="text-muted">No task hours data found for the selected period</p>
                  <p className="text-muted small mt-2">Make sure you have tasks with hours added in the selected date range</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Hour target set/edit modal */}
      {showHourTargetModal && (
        <div
          className="hour-target-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowHourTargetModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="hour-target-modal-title"
        >
          <div className="hour-target-modal">
            <div className="hour-target-modal-header">
              <div className="hour-target-modal-title-wrap">
                <span className="hour-target-modal-icon" aria-hidden>⏱</span>
                <h2 id="hour-target-modal-title" className="hour-target-modal-title">Set hour target</h2>
              </div>
              <button
                type="button"
                className="hour-target-modal-close"
                onClick={() => setShowHourTargetModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="hour-target-modal-body">
              <div className="hour-target-field">
                <label htmlFor="hour-target-start-date" className="hour-target-label">Start date</label>
                <input
                  id="hour-target-start-date"
                  type="date"
                  className="hour-target-input"
                  value={hourTargetForm.startDate}
                  onChange={(e) => setHourTargetForm(f => ({ ...f, startDate: e.target.value }))}
                />
              </div>

              <div className="hour-target-field">
                <label htmlFor="hour-target-end-date" className="hour-target-label">End date</label>
                <input
                  id="hour-target-end-date"
                  type="date"
                  className="hour-target-input"
                  value={hourTargetForm.endDate}
                  onChange={(e) => setHourTargetForm(f => ({ ...f, endDate: e.target.value }))}
                />
              </div>
              <div className="hour-target-field">
                <label htmlFor="hour-target-hours" className="hour-target-label">Target hours</label>
                <input
                  id="hour-target-hours"
                  type="number"
                  className="hour-target-input"
                  min={0}
                  placeholder="e.g. 10"
                  value={hourTargetForm.hours}
                  onChange={(e) => setHourTargetForm(f => ({ ...f, hours: e.target.value }))}
                />
                <p className="hour-target-hint">Leave empty to clear your target.</p>
              </div>
            </div>
            <div className="hour-target-modal-footer">
              <button type="button" className="hour-target-btn hour-target-btn-cancel" onClick={() => setShowHourTargetModal(false)}>
                Cancel
              </button>

              {hourTargetProgress?.target_hours != null && hourTargetProgress?.target_start_date && hourTargetProgress?.target_end_date && (
                <button
                  type="button"
                  className="hour-target-btn hour-target-btn-danger"
                  onClick={handleDeleteHourTarget}
                  disabled={deletingHourTarget}
                >
                  {deletingHourTarget ? 'Deleting…' : 'Delete'}
                </button>
              )}

              <button
                type="button"
                className="hour-target-btn hour-target-btn-save"
                onClick={handleSaveHourTarget}
                disabled={savingHourTarget}
              >
                {savingHourTarget ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
