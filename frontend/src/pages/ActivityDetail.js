import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../config/api';
import { 
  CalendarIcon, MapPinIcon, UsersIcon, CheckIcon, ClockIcon, 
  PlusIcon, ArrowLeftIcon, EditIcon, TargetIcon, FileIcon, TrashIcon, EyeIcon 
} from '../components/Icons';
import '../css/ActivityDetail.css';

const ActivityDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    dueDate: '',
    totalHours: '',
    status: 'in-progress'
  });
  const [editTaskData, setEditTaskData] = useState({
    title: '',
    description: '',
    startDate: '',
    dueDate: '',
    totalHours: '',
    status: 'in-progress'
  });
  const [progress, setProgress] = useState(0);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [newProgress, setNewProgress] = useState(0);
  const [viewTask, setViewTask] = useState(null); // task object when viewing task details
  const [currentUser, setCurrentUser] = useState(null);
  const [taskUsers, setTaskUsers] = useState({}); // { taskId: [users] }
  const [allUsers, setAllUsers] = useState([]);
  const [openUserDropdownTaskId, setOpenUserDropdownTaskId] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const taskUserDropdownRefs = useRef({});
  const [selectedUsersForAddTask, setSelectedUsersForAddTask] = useState([]);
  const [isAddTaskUserDropdownOpen, setIsAddTaskUserDropdownOpen] = useState(false);
  const [addTaskUserSearchQuery, setAddTaskUserSearchQuery] = useState('');
  const addTaskUserDropdownRef = useRef(null);
  const [selectedUsersForEditTask, setSelectedUsersForEditTask] = useState([]);
  const [isEditTaskUserDropdownOpen, setIsEditTaskUserDropdownOpen] = useState(false);
  const [editTaskUserSearchQuery, setEditTaskUserSearchQuery] = useState('');
  const editTaskUserDropdownRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);

    loadActivity();
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      Object.keys(taskUserDropdownRefs.current).forEach(taskId => {
        const ref = taskUserDropdownRefs.current[taskId];
        if (ref && !ref.contains(event.target)) {
          setOpenUserDropdownTaskId(null);
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [id, navigate]);

  // Recalculate progress when tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      const newProgress = calculateProgressFromTasks(tasks);
      setProgress(newProgress);

      // If all tasks are completed, update activity status to completed
      if (tasks.every(task => task.completed || task.status === 'completed')) {
        setProgress(100);
        if (activity && activity.status !== 'completed') {
          setActivity(prev => ({
            ...prev,
            status: 'completed',
            progress: 100
          }));
        }
      } else if (activity) {
        // If there is at least one active task, keep activity ongoing.
        // This avoids stale "completed" status when a new in-progress task is added.
        if (activity.status !== 'ongoing' || progress !== newProgress) {
          setActivity(prev => ({
            ...prev,
            status: 'ongoing',
            progress: newProgress
          }));
        }
      }
    } else {
      setProgress(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const getStatusFromDates = (startDate, endDate) => {
    if (!startDate) return 'upcoming';
    
    const now = new Date();
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    if (end && end < now) {
      return 'completed';
    } else if (start <= now && (!end || end >= now)) {
      return 'ongoing';
    } else {
      return 'upcoming';
    }
  };

  // Calculate progress based on completed tasks
  const calculateProgressFromTasks = (tasksList) => {
    if (!tasksList || tasksList.length === 0) return 0;
    
    const completedTasks = tasksList.filter(task => task.completed || task.status === 'completed').length;
    const progress = Math.round((completedTasks / tasksList.length) * 100);
    return progress;
  };

  const calculateProgress = (startDate, endDate, status) => {
    if (status === 'completed') return 100;
    if (status === 'upcoming') return 0;
    
    // For ongoing activities, calculate progress based on time elapsed
    if (status === 'ongoing' && startDate && endDate) {
      const now = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);
      const total = end - start;
      const elapsed = now - start;
      
      if (total > 0) {
        const progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
        return progress;
      }
    }
    
    // Default progress for ongoing activities without end date
    return status === 'ongoing' ? 50 : 0;
  };

  const loadActivity = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/activities/${id}`);
      
      if (response.data.success) {
        const apiActivity = response.data.data;
        // Use API status when provided (includes task-based completion), else fallback to dates
        const status = apiActivity.status || getStatusFromDates(apiActivity.start_date, apiActivity.end_date);
        const progress = calculateProgress(apiActivity.start_date, apiActivity.end_date, status);
        
        // Map API response to component format
        const mappedActivity = {
          id: apiActivity.id,
          title: apiActivity.title,
          description: apiActivity.description || '',
          category: apiActivity.category || '',
          organization: apiActivity.organization_name || '',
          location: apiActivity.location || '',
          date: apiActivity.start_date,
          start_date: apiActivity.start_date,
          end_date: apiActivity.end_date,
          status,
          progress,
          volunteers: apiActivity.participant_count || 0,
          maxVolunteers: apiActivity.max_participants || null,
          is_public: apiActivity.is_public,
          is_joined: apiActivity.is_joined || false,
          created_by: apiActivity.created_by,
          creator_name: apiActivity.creator_name,
          creator_email: apiActivity.creator_email,
          participants: apiActivity.participants || [],
          createdAt: apiActivity.created_at
        };
        
        setActivity(mappedActivity);
        setProgress(progress);
        
        // Fetch all users for task assignment (only if user is admin or activity creator)
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const isAdmin = user.role === 0 || user.user_type === 'admin';
        const isActivityCreator = mappedActivity.created_by === user.id;
        
        if (isAdmin || isActivityCreator) {
          await fetchAllUsers();
        } else if (mappedActivity.participants && mappedActivity.participants.length > 0) {
          // For regular users, use activity participants for task assignment
          setAllUsers(mappedActivity.participants.map(p => ({
            id: p.user_id,
            name: p.name,
            email: p.email,
            is_active: true
          })));
        }
        
        // Load tasks for this activity from API
        await loadTasks();
      } else {
        console.error('Failed to load activity:', response.data.message);
        navigate('/activities');
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
      if (error.response?.status === 404 || error.response?.status === 403) {
        navigate('/activities');
      } else {
        // Show error but don't navigate away
        console.error('Failed to load activity:', error.response?.data?.message || error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoinActivity = async () => {
    try {
      const response = await api.post(`/activities/${id}/join`);
      if (response.data.success) {
        // Reload activity to update join status
        await loadActivity();
        alert('Successfully joined the activity!');
      } else {
        alert(response.data.message || 'Failed to join activity. Please try again.');
      }
    } catch (error) {
      console.error('Error joining activity:', error);
      alert(error.response?.data?.message || 'Failed to join activity. Please try again.');
    }
  };

  const handleLeaveActivity = async () => {
    if (!window.confirm('Are you sure you want to leave this activity?')) {
      return;
    }

    try {
      const response = await api.post(`/activities/${id}/leave`);
      if (response.data.success) {
        // Reload activity to update join status
        await loadActivity();
        alert('Successfully left the activity.');
      } else {
        alert(response.data.message || 'Failed to leave activity. Please try again.');
      }
    } catch (error) {
      console.error('Error leaving activity:', error);
      alert(error.response?.data?.message || 'Failed to leave activity. Please try again.');
    }
  };

  const loadTasks = async () => {
    try {
      const response = await api.get(`/activities/${id}/tasks`);
      if (response.data.success) {
        // Map API response to component format
        const mappedTasks = response.data.data.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          startDate: task.start_date ? task.start_date.split('T')[0] : '',
          dueDate: task.due_date ? task.due_date.split('T')[0] : '',
          totalHours: task.total_hours || '',
          status: task.status || 'in-progress',
          completed: task.completed || false,
          created_by: task.created_by,
          creator_name: task.creator_name,
          creator_user_type: task.creator_user_type,
          creator_role: task.creator_role
        }));
        setTasks(mappedTasks);
        
        // Calculate progress based on tasks
        const taskProgress = calculateProgressFromTasks(mappedTasks);
        setProgress(taskProgress);

        // Keep activity status in sync with task completion state.
        if (mappedTasks.length > 0) {
          const allCompleted = mappedTasks.every(task => task.completed || task.status === 'completed');
          const nextStatus = allCompleted ? 'completed' : 'ongoing';
          const nextProgress = allCompleted ? 100 : taskProgress;
          setProgress(nextProgress);
          setActivity(prev => (prev ? { ...prev, status: nextStatus, progress: nextProgress } : prev));
        } else {
          // No tasks: fallback to date-based status.
          setActivity(prev => (
            prev
              ? {
                  ...prev,
                  status: getStatusFromDates(prev.start_date, prev.end_date),
                  progress: 0
                }
              : prev
          ));
        }
        
        // Load users for each task
        for (const task of mappedTasks) {
          await loadTaskUsers(task.id);
        }
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    }
  };

  const loadTaskUsers = async (taskId) => {
    try {
      const response = await api.get(`/activities/${id}/tasks/${taskId}/users`);
      if (response.data.success) {
        setTaskUsers(prev => ({
          ...prev,
          [taskId]: response.data.data || []
        }));
      }
    } catch (error) {
      console.error(`Error loading users for task ${taskId}:`, error);
      setTaskUsers(prev => ({
        ...prev,
        [taskId]: []
      }));
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await api.get('/users');
      if (response.data.success) {
        const filteredUsers = (response.data.data || []).filter(u => u.is_active);
        setAllUsers(filteredUsers);
      }
    } catch (error) {
      // Silently fail if user doesn't have permission (expected for non-admin users)
      if (error.response?.status !== 403) {
        console.error('Error fetching users:', error);
      }
      // For non-admin users, use activity participants instead (if available)
      // This will be set after activity loads
      setAllUsers([]);
    }
  };

  const addUserToTask = async (taskId, userId) => {
    try {
      const response = await api.post(`/activities/${id}/tasks/${taskId}/users`, {
        user_id: userId
      });
      if (response.data.success) {
        await loadTaskUsers(taskId);
        setOpenUserDropdownTaskId(null);
        setUserSearchQuery('');
      } else {
        alert(response.data.message || 'Failed to add user to task');
      }
    } catch (error) {
      console.error('Error adding user to task:', error);
      alert(error.response?.data?.message || 'Failed to add user to task');
    }
  };

  const updateTaskUserStatus = async (taskId, userId, status) => {
    try {
      const response = await api.put(`/activities/${id}/tasks/${taskId}/users/${userId}`, {
        status: status
      });
      if (response.data.success) {
        await loadTaskUsers(taskId);
      } else {
        alert(response.data.message || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating task user status:', error);
      alert(error.response?.data?.message || 'Failed to update user status');
    }
  };

  const removeUserFromTask = async (taskId, userId) => {
    try {
      const response = await api.delete(`/activities/${id}/tasks/${taskId}/users/${userId}`);
      if (response.data.success) {
        await loadTaskUsers(taskId);
      } else {
        alert(response.data.message || 'Failed to remove user from task');
      }
    } catch (error) {
      console.error('Error removing user from task:', error);
      alert(error.response?.data?.message || 'Failed to remove user from task');
    }
  };

  const handleTaskInputChange = (e) => {
    const { name, value } = e.target;
    setTaskFormData({
      ...taskFormData,
      [name]: value
    });
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskFormData.title.trim()) return;

    try {
      const taskData = {
        title: taskFormData.title.trim(),
        description: taskFormData.description.trim() || null,
        start_date: taskFormData.startDate || null,
        due_date: taskFormData.dueDate || null,
        total_hours: taskFormData.totalHours ? parseInt(taskFormData.totalHours) : null,
        status: taskFormData.status || 'in-progress'
      };

      const response = await api.post(`/activities/${id}/tasks`, taskData);
      
      if (response.data.success) {
        // Reload tasks from API
        await loadTasks();
        
        // Clear form but keep it open so user can add multiple tasks quickly
        setTaskFormData({
          title: '',
          description: '',
          startDate: '',
          dueDate: '',
          totalHours: '',
          status: 'in-progress'
        });
        setSelectedUsersForAddTask([]);
        setAddTaskUserSearchQuery('');
        setIsAddTaskUserDropdownOpen(false);
        
        // Keep form open so user can add multiple tasks quickly
        // Form will stay open until user clicks "Close" button
      } else {
        console.error('Failed to add task:', response.data.message);
        alert('Failed to add task. Please try again.');
      }
    } catch (error) {
      console.error('Error adding task:', error);
      const errorMessage = error.response?.data?.message || 'Failed to add task. Please try again.';
      const debugInfo = error.response?.data?.debug;
      
      if (debugInfo) {
        console.log('Permission check details:', debugInfo);
        alert(`${errorMessage}\n\nDebug info: isAdmin=${debugInfo.isAdmin}, isCreator=${debugInfo.isActivityCreator}, hasJoined=${debugInfo.hasJoined}, participantCount=${debugInfo.participantCount}`);
      } else {
        alert(errorMessage);
      }
    }
  };

  const handleEditTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setEditingTaskId(taskId);
      setEditTaskData({
        title: task.title,
        description: task.description || '',
        startDate: task.startDate || '',
        dueDate: task.dueDate || '',
        totalHours: task.totalHours || '',
        status: task.status
      });
      
      // Load current users for this task
      const currentTaskUsers = taskUsers[taskId] || [];
      setSelectedUsersForEditTask(currentTaskUsers.map(tu => String(tu.user_id)));
      setEditTaskUserSearchQuery('');
      setIsEditTaskUserDropdownOpen(false);
    }
  };

  const handleEditTaskInputChange = (e) => {
    const { name, value } = e.target;
    setEditTaskData({
      ...editTaskData,
      [name]: value
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTaskData.title.trim()) return;

    try {
      const taskData = {
        title: editTaskData.title.trim(),
        description: editTaskData.description.trim() || null,
        start_date: editTaskData.startDate || null,
        due_date: editTaskData.dueDate || null,
        total_hours: editTaskData.totalHours ? parseInt(editTaskData.totalHours) : null,
        status: editTaskData.status || 'in-progress',
        completed: editTaskData.status === 'completed'
      };

      const response = await api.put(`/activities/${id}/tasks/${editingTaskId}`, taskData);
      
      if (response.data.success) {
        // Get current users for this task
        const currentTaskUsers = taskUsers[editingTaskId] || [];
        const currentUserIds = currentTaskUsers.map(tu => String(tu.user_id));
        
        // Find users to add and remove
        const usersToAdd = selectedUsersForEditTask.filter(id => !currentUserIds.includes(id));
        const usersToRemove = currentUserIds.filter(id => !selectedUsersForEditTask.includes(id));
        
        // Remove users
        for (const userId of usersToRemove) {
          try {
            await api.delete(`/activities/${id}/tasks/${editingTaskId}/users/${userId}`);
          } catch (error) {
            console.error(`Error removing user ${userId} from task:`, error);
          }
        }
        
        // Add users
        for (const userId of usersToAdd) {
          try {
            await api.post(`/activities/${id}/tasks/${editingTaskId}/users`, {
              user_id: userId
            });
          } catch (error) {
            console.error(`Error adding user ${userId} to task:`, error);
          }
        }
        
        // Reload tasks from API (updates progress and activity status when all tasks completed)
        await loadTasks();
        
        setEditingTaskId(null);
        setEditTaskData({
          title: '',
          description: '',
          startDate: '',
          dueDate: '',
          totalHours: '',
          status: 'in-progress'
        });
        setSelectedUsersForEditTask([]);
        setEditTaskUserSearchQuery('');
        setIsEditTaskUserDropdownOpen(false);
      } else {
        console.error('Failed to update task:', response.data.message);
        alert('Failed to update task. Please try again.');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert(error.response?.data?.message || 'Failed to update task. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditTaskData({
      title: '',
      description: '',
      startDate: '',
      dueDate: '',
      totalHours: '',
      status: 'in-progress'
    });
  };

  const toggleTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newCompleted = !task.completed;
    const newStatus = newCompleted ? 'completed' : (task.status === 'completed' ? 'in-progress' : task.status);

    try {
      const response = await api.put(`/activities/${id}/tasks/${taskId}`, {
        completed: newCompleted,
        status: newStatus
      });

      if (response.data.success) {
        // Reload tasks from API (updates progress and activity status when all tasks completed)
        await loadTasks();
      } else {
        console.error('Failed to toggle task:', response.data.message);
      }
    } catch (error) {
      console.error('Error toggling task:', error);
      alert(error.response?.data?.message || 'Failed to update task. Please try again.');
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const response = await api.put(`/activities/${id}/tasks/${taskId}`, {
        status: newStatus,
        completed: newStatus === 'completed'
      });

      if (response.data.success) {
        // Reload tasks from API; loadTasks will update progress and activity status (including completed when all tasks done)
        await loadTasks();
      } else {
        console.error('Failed to update task status:', response.data.message);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      alert(error.response?.data?.message || 'Failed to update task status. Please try again.');
    }
  };

  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'in-progress':
        return '#2563eb';
      default:
        return '#6b7280';
    }
  };

  const getTaskStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      default:
        return status;
    }
  };

  // Check if current user can add tasks to this activity
  const canAddTask = () => {
    if (!currentUser || !activity) return false;
    
    const isAdmin = currentUser.role === 0 || currentUser.user_type === 'admin';
    const isActivityCreator = activity.created_by === currentUser.id;
    const hasJoined = activity.is_joined === true || activity.is_joined === 1;
    // Allow adding tasks for ongoing, upcoming, or any activity if user has permission
    const isActiveActivity = activity.status === 'ongoing' || activity.status === 'upcoming' || activity.status === 'completed';
    
    return (isAdmin || isActivityCreator || hasJoined);
  };

  // Check if current user can edit a task
  const canEditTask = (task) => {
    if (!currentUser || !task) return false;
    
    const isAdmin = currentUser.role === 0 || currentUser.user_type === 'admin';
    const taskCreatorIsAdmin = task.creator_role === 0 || task.creator_user_type === 'admin';
    const isTaskCreator = task.created_by === currentUser.id;
    
    // If task was created by admin, only admin can edit
    if (taskCreatorIsAdmin) {
      return isAdmin;
    }
    
    // If task was created by regular user, only that user can edit
    return isTaskCreator;
  };

  // Check if current user can delete a task
  const canDeleteTask = (task) => {
    if (!currentUser || !task) return false;
    
    const isAdmin = currentUser.role === 0 || currentUser.user_type === 'admin';
    const taskCreatorIsAdmin = task.creator_role === 0 || task.creator_user_type === 'admin';
    const isTaskCreator = task.created_by === currentUser.id;
    
    // Admin can delete any task (created by admin or regular user)
    if (isAdmin) {
      return true;
    }
    
    // If task was created by admin, only admin can delete
    if (taskCreatorIsAdmin) {
      return false; // Regular users cannot delete admin tasks
    }
    
    // If task was created by regular user, only that user can delete it
    return isTaskCreator;
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const response = await api.delete(`/activities/${id}/tasks/${taskId}`);
      
      if (response.data.success) {
        // Reload tasks from API (updates progress and activity status when all tasks completed)
        await loadTasks();
      } else {
        console.error('Failed to delete task:', response.data.message);
        alert('Failed to delete task. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert(error.response?.data?.message || 'Failed to delete task. Please try again.');
    }
  };

  const updateProgress = (newProgressValue) => {
    setProgress(newProgressValue);
    setActivity(prev => (prev ? { ...prev, progress: newProgressValue } : prev));
  };

  const handleProgressSubmit = (e) => {
    e.preventDefault();
    if (newProgress >= 0 && newProgress <= 100) {
      updateProgress(newProgress);
      setShowProgressModal(false);
      setNewProgress(progress);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ongoing':
        return '#10b981'; // Changed to green for better visibility on blue background
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

  if (!activity) {
    return (
      <div className="dashboard-content">
        <div className="container-fluid">
          <div className="alert alert-danger" role="alert">
            Activity not found
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
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h1 className="mb-1 fw-bold text-white" style={{ fontSize: '1.75rem' }}>{activity.title}</h1>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span 
                  className="badge"
                  style={{ 
                    backgroundColor: activity.status === 'ongoing' ? '#d1fae5' : (getStatusColor(activity.status) + '20'), 
                    color: getStatusColor(activity.status),
                    padding: '0.375rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    border: activity.status === 'ongoing' ? '1px solid #10b981' : 'none'
                  }}
                >
                  {getStatusLabel(activity.status)}
                </span>
                {activity.category && (
                  <span className="badge bg-light text-dark" style={{ padding: '0.375rem 0.75rem', borderRadius: '6px', fontSize: '0.875rem' }}>
                    {activity.category}
                  </span>
                )}
              </div>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              
              {/* Join/Leave button for regular users on public activities */}
              {currentUser && !(currentUser.role === 0 || currentUser.user_type === 'admin') && activity.is_public ? (
                <>
                  {!activity.is_joined ? (
                    <button 
                      onClick={handleJoinActivity}
                      className="btn btn-success d-flex align-items-center gap-2"
                      style={{ 
                        padding: '0.625rem 1.25rem',
                        borderRadius: '8px',
                        fontWeight: '600',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                      }}
                    >
                      <PlusIcon style={{ width: '18px', height: '18px' }} />
                      <span>Join Activity</span>
                    </button>
                  ) : (
                    <button 
                      onClick={handleLeaveActivity}
                      className="btn btn-outline-danger d-flex align-items-center gap-2"
                      style={{ 
                        padding: '0.625rem 1.25rem',
                        borderRadius: '8px',
                        fontWeight: '600'
                      }}
                    >
                      <CheckIcon style={{ width: '18px', height: '18px' }} />
                      <span>Leave Activity</span>
                    </button>
                  )}
                </>
              ) : null}
              {currentUser && (currentUser.role === 0 || currentUser.user_type === 'admin' || activity.created_by === currentUser.id) ? (
                <button 
                  onClick={() => navigate(`/activities/${id}/edit`)}
                  className="btn btn-light d-flex align-items-center gap-2"
                  style={{ 
                    padding: '0.625rem 1.25rem',
                    borderRadius: '8px',
                    fontWeight: '600',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                  }}
                >
                  <EditIcon style={{ width: '18px', height: '18px' }} />
                  <span>Edit</span>
                </button>
              ) : null}
              <button 
                onClick={() => navigate('/activities')} 
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
        </div>

        {/* Activity Info Card */}
        <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          <div className="card-body p-4">
              {activity.description && (
                <p className="mb-4" style={{ fontSize: '1rem', color: '#64748b', lineHeight: '1.6' }}>
                  {activity.description}
                </p>
              )}

              <div className="row g-3 mb-4">
                <div className="col-md-6 col-lg-3">
                  <div className="d-flex align-items-start gap-3 p-3" style={{ background: '#f8f9fa', borderRadius: '12px' }}>
                    <CalendarIcon style={{ width: '24px', height: '24px', color: '#2563eb', marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div className="text-muted small mb-1">Date</div>
                      <div className="fw-semibold" style={{ fontSize: '0.9375rem', color: '#1e293b' }}>
                        {activity.start_date ? new Date(activity.start_date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Not set'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-6 col-lg-3">
                  <div className="d-flex align-items-start gap-3 p-3" style={{ background: '#f8f9fa', borderRadius: '12px' }}>
                    <MapPinIcon style={{ width: '24px', height: '24px', color: '#2563eb', marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div className="text-muted small mb-1">Location</div>
                      <div className="fw-semibold" style={{ fontSize: '0.9375rem', color: '#1e293b' }}>
                        {activity.location || 'Not specified'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Number of Volunteers: only show for admin */}
                {currentUser && (currentUser.role === 0 || currentUser.user_type === 'admin') && (
                  <div className="col-md-6 col-lg-3">
                    <div className="d-flex align-items-start gap-3 p-3" style={{ background: '#f8f9fa', borderRadius: '12px' }}>
                      <UsersIcon style={{ width: '24px', height: '24px', color: '#2563eb', marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div className="text-muted small mb-1">Volunteers</div>
                        <div className="fw-semibold" style={{ fontSize: '0.9375rem', color: '#1e293b' }}>
                          {activity.volunteers} {activity.maxVolunteers ? `/ ${activity.maxVolunteers}` : ''}
                          {!activity.maxVolunteers && activity.volunteers === 1 ? ' volunteer' : ''}
                          {!activity.maxVolunteers && activity.volunteers !== 1 ? ' volunteers' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activity.organization && (
                  <div className="col-md-6 col-lg-3">
                    <div className="d-flex align-items-start gap-3 p-3" style={{ background: '#f8f9fa', borderRadius: '12px' }}>
                      <div>
                        <div className="text-muted small mb-1">Organization</div>
                        <div className="fw-semibold" style={{ fontSize: '0.9375rem', color: '#1e293b' }}>
                          {activity.organization}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {(activity.status === 'ongoing' || activity.status === 'completed') && tasks.length > 0 && (
                <div className="mt-4 pt-4 border-top">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-semibold" style={{ fontSize: '0.9375rem', color: '#1e293b' }}>Overall Progress</span>
                    <span className="fw-bold" style={{ fontSize: '1rem', color: getStatusColor(activity.status) }}>{progress}%</span>
                  </div>
                  <div className="progress" style={{ height: '10px', borderRadius: '10px', backgroundColor: '#e5e7eb' }}>
                    <div 
                      className="progress-bar" 
                      role="progressbar" 
                      style={{ 
                        width: `${progress}%`, 
                        backgroundColor: getStatusColor(activity.status),
                        borderRadius: '10px',
                        transition: 'width 0.3s ease'
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="card shadow-sm border-0" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="mb-0 fw-bold" style={{ fontSize: '1.5rem', color: '#1e293b' }}>Tasks</h2>
              {canAddTask() ? (
                <button 
                  onClick={() => setShowAddTask(true)}
                  className="btn btn-primary d-flex align-items-center gap-2"
                  style={{ 
                    padding: '0.625rem 1.25rem',
                    borderRadius: '8px',
                    fontWeight: '600',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  <PlusIcon style={{ width: '18px', height: '18px' }} />
                  <span>Add Task</span>
                </button>
              ) : null}
            </div>

          {showAddTask && (
            <form onSubmit={handleAddTask} className="add-task-form">
              <div className="form-group">
                <label htmlFor="task-title">Task Title *</label>
                <input
                  type="text"
                  id="task-title"
                  name="title"
                  placeholder="Enter task title..."
                  value={taskFormData.title}
                  onChange={handleTaskInputChange}
                  className="task-input"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="task-description">Description</label>
                <textarea
                  id="task-description"
                  name="description"
                  placeholder="Enter task description..."
                  value={taskFormData.description}
                  onChange={handleTaskInputChange}
                  className="task-textarea"
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="task-start-date">Start Date</label>
                  <input
                    type="date"
                    id="task-start-date"
                    name="startDate"
                    value={taskFormData.startDate}
                    onChange={handleTaskInputChange}
                    className="task-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="task-due-date">Due Date</label>
                  <input
                    type="date"
                    id="task-due-date"
                    name="dueDate"
                    value={taskFormData.dueDate}
                    onChange={handleTaskInputChange}
                    className="task-input"
                    min={taskFormData.startDate || ''}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="task-total-hours">Total Working Hours</label>
                  <input
                    type="number"
                    id="task-total-hours"
                    name="totalHours"
                    value={taskFormData.totalHours}
                    onChange={handleTaskInputChange}
                    className="task-input"
                    placeholder="e.g., 8"
                    min="0"
                    step="0.5"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="task-status">Status *</label>
                  <select
                    id="task-status"
                    name="status"
                    value={taskFormData.status}
                    onChange={handleTaskInputChange}
                    className="task-select"
                  >
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Assign Users Section - Admin Only */}
              {currentUser && (currentUser.role === 0 || currentUser.user_type === 'admin') ? (
                <div className="form-group">
                  <label className="form-label">
                    <UsersIcon className="label-icon" />
                    <span className="label-text">Assign Users (Optional)</span>
                  </label>
                  <div className="user-selection-container" ref={addTaskUserDropdownRef}>
                    <div 
                      className="user-dropdown-trigger"
                      onClick={() => setIsAddTaskUserDropdownOpen(!isAddTaskUserDropdownOpen)}
                    >
                      <input
                        type="text"
                        placeholder={selectedUsersForAddTask.length > 0 
                          ? `${selectedUsersForAddTask.length} user(s) selected` 
                          : 'Click to select users...'}
                        value=""
                        readOnly
                        className="user-dropdown-input"
                      />
                      <span className="user-dropdown-arrow">{isAddTaskUserDropdownOpen ? '▲' : '▼'}</span>
                    </div>
                    {isAddTaskUserDropdownOpen && (
                      <div className="user-dropdown-menu">
                        <div className="user-search-box">
                          <input
                            type="text"
                            placeholder="Search users..."
                            value={addTaskUserSearchQuery}
                            onChange={(e) => setAddTaskUserSearchQuery(e.target.value)}
                            className="user-search-input"
                            autoFocus
                          />
                        </div>
                        <div className="user-dropdown-list">
                          {allUsers
                            .filter(u => {
                              const searchLower = addTaskUserSearchQuery.toLowerCase();
                              return u.name.toLowerCase().includes(searchLower) || 
                                     u.email.toLowerCase().includes(searchLower);
                            })
                            .map((u) => {
                              const isSelected = selectedUsersForAddTask.includes(String(u.id));
                              return (
                                <div
                                  key={u.id}
                                  className={`user-dropdown-item ${isSelected ? 'selected' : ''}`}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedUsersForAddTask(selectedUsersForAddTask.filter(id => id !== String(u.id)));
                                    } else {
                                      setSelectedUsersForAddTask([...selectedUsersForAddTask, String(u.id)]);
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
                            const searchLower = addTaskUserSearchQuery.toLowerCase();
                            return u.name.toLowerCase().includes(searchLower) || 
                                   u.email.toLowerCase().includes(searchLower);
                          }).length === 0 && (
                            <div className="user-dropdown-empty">
                              No users found
                            </div>
                          )}
                        </div>
                        {selectedUsersForAddTask.length > 0 && (
                          <div className="user-dropdown-footer">
                            {selectedUsersForAddTask.length} user(s) selected
                          </div>
                        )}
                      </div>
                    )}
                    {selectedUsersForAddTask.length > 0 && (
                      <div className="selected-users-chips">
                        {selectedUsersForAddTask.map(userId => {
                          const user = allUsers.find(u => String(u.id) === userId);
                          if (!user) return null;
                          return (
                            <span key={userId} className="user-chip">
                              {user.name}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUsersForAddTask(selectedUsersForAddTask.filter(id => id !== userId));
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
              ) : null}

              <div className="task-form-actions">
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowAddTask(false); 
                      setTaskFormData({
                        title: '',
                        description: '',
                        startDate: '',
                        dueDate: '',
                        totalHours: '',
                        status: 'in-progress'
                      });
                      setSelectedUsersForAddTask([]);
                      setAddTaskUserSearchQuery('');
                      setIsAddTaskUserDropdownOpen(false);
                    }} 
                    className="cancel-btn"
                  >
                    Close
                  </button>
                  <button type="submit" className="submit-btn">Add Task</button>
                </div>
              </div>
            </form>
          )}

          {tasks.length === 0 ? (
            <div className="empty-tasks">
              <p>No tasks yet. Add your first task to get started!</p>
            </div>
          ) : (
            <>
              {editingTaskId && (
                <form onSubmit={handleSaveEdit} className="edit-task-form" style={{ marginBottom: '1.5rem' }}>
                      <div className="form-group">
                        <label htmlFor={`edit-title-${editingTaskId}`}>Task Title *</label>
                        <input
                          type="text"
                          id={`edit-title-${editingTaskId}`}
                          name="title"
                          value={editTaskData.title}
                          onChange={handleEditTaskInputChange}
                          className="task-input"
                          required
                          autoFocus
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`edit-description-${editingTaskId}`}>Description</label>
                        <textarea
                          id={`edit-description-${editingTaskId}`}
                          name="description"
                          value={editTaskData.description}
                          onChange={handleEditTaskInputChange}
                          className="task-textarea"
                          rows="3"
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor={`edit-start-date-${editingTaskId}`}>Start Date</label>
                          <input
                            type="date"
                            id={`edit-start-date-${editingTaskId}`}
                            name="startDate"
                            value={editTaskData.startDate}
                            onChange={handleEditTaskInputChange}
                            className="task-input"
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor={`edit-due-date-${editingTaskId}`}>Due Date</label>
                          <input
                            type="date"
                            id={`edit-due-date-${editingTaskId}`}
                            name="dueDate"
                            value={editTaskData.dueDate}
                            onChange={handleEditTaskInputChange}
                            className="task-input"
                            min={editTaskData.startDate || ''}
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor={`edit-total-hours-${editingTaskId}`}>Total Working Hours</label>
                          <input
                            type="number"
                            id={`edit-total-hours-${editingTaskId}`}
                            name="totalHours"
                            value={editTaskData.totalHours}
                            onChange={handleEditTaskInputChange}
                            className="task-input"
                            placeholder="e.g., 8"
                            min="0"
                            step="0.5"
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor={`edit-status-${editingTaskId}`}>Status *</label>
                          <select
                            id={`edit-status-${editingTaskId}`}
                            name="status"
                            value={editTaskData.status}
                            onChange={handleEditTaskInputChange}
                            className="task-select"
                          >
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>

                      {/* Assign Users Section - Admin Only */}
                      {currentUser && (currentUser.role === 0 || currentUser.user_type === 'admin' || activity.created_by === currentUser.id) && (
                        <div className="form-group">
                          <label className="form-label">
                            <UsersIcon className="label-icon" />
                            <span className="label-text">Assign Users (Optional)</span>
                          </label>
                          <div className="user-selection-container" ref={editTaskUserDropdownRef}>
                            <div 
                              className="user-dropdown-trigger"
                              onClick={() => setIsEditTaskUserDropdownOpen(!isEditTaskUserDropdownOpen)}
                            >
                              <input
                                type="text"
                                placeholder={selectedUsersForEditTask.length > 0 
                                  ? `${selectedUsersForEditTask.length} user(s) selected` 
                                  : 'Click to select users...'}
                                value=""
                                readOnly
                                className="user-dropdown-input"
                              />
                              <span className="user-dropdown-arrow">{isEditTaskUserDropdownOpen ? '▲' : '▼'}</span>
                            </div>
                            {isEditTaskUserDropdownOpen && (
                              <div className="user-dropdown-menu">
                                <div className="user-search-box">
                                  <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={editTaskUserSearchQuery}
                                    onChange={(e) => setEditTaskUserSearchQuery(e.target.value)}
                                    className="user-search-input"
                                    autoFocus
                                  />
                                </div>
                                <div className="user-dropdown-list">
                                  {allUsers
                                    .filter(u => {
                                      const searchLower = editTaskUserSearchQuery.toLowerCase();
                                      return u.name.toLowerCase().includes(searchLower) || 
                                             u.email.toLowerCase().includes(searchLower);
                                    })
                                    .map((u) => {
                                      const isSelected = selectedUsersForEditTask.includes(String(u.id));
                                      return (
                                        <div
                                          key={u.id}
                                          className={`user-dropdown-item ${isSelected ? 'selected' : ''}`}
                                          onClick={() => {
                                            if (isSelected) {
                                              setSelectedUsersForEditTask(selectedUsersForEditTask.filter(id => id !== String(u.id)));
                                            } else {
                                              setSelectedUsersForEditTask([...selectedUsersForEditTask, String(u.id)]);
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
                                    const searchLower = editTaskUserSearchQuery.toLowerCase();
                                    return u.name.toLowerCase().includes(searchLower) || 
                                           u.email.toLowerCase().includes(searchLower);
                                  }).length === 0 && (
                                    <div className="user-dropdown-empty">
                                      No users found
                                    </div>
                                  )}
                                </div>
                                {selectedUsersForEditTask.length > 0 && (
                                  <div className="user-dropdown-footer">
                                    {selectedUsersForEditTask.length} user(s) selected
                                  </div>
                                )}
                              </div>
                            )}
                            {selectedUsersForEditTask.length > 0 && (
                              <div className="selected-users-chips">
                                {selectedUsersForEditTask.map(userId => {
                                  const user = allUsers.find(u => String(u.id) === userId);
                                  if (!user) return null;
                                  return (
                                    <span key={userId} className="user-chip">
                                      {user.name}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedUsersForEditTask(selectedUsersForEditTask.filter(id => id !== userId));
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
                      )}

                      <div className="task-form-actions">
                        <button 
                          type="button" 
                          onClick={handleCancelEdit}
                          className="cancel-btn"
                        >
                          Cancel
                        </button>
                        <button type="submit" className="submit-btn">Save Changes</button>
                      </div>
                </form>
              )}
              <div className="tasks-table-wrapper">
                <div className="table-responsive">
                  <table className="tasks-table table table-striped table-hover">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Date</th>
                        <th>Description</th>
                        <th className="text-end">Working hours</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => (
                        <tr key={task.id}>
                          <td className="task-cell">
                            <div className="task-avatar">
                              {task.title ? task.title.charAt(0).toUpperCase() : 'T'}
                            </div>
                            <span className={task.completed ? 'task-title completed' : 'task-title'}>{task.title || 'N/A'}</span>
                          </td>
                          <td>
                            {task.dueDate ? (
                              new Date(task.dueDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })
                            ) : task.startDate ? (
                              new Date(task.startDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })
                            ) : '-'}
                          </td>
                          <td className="task-description-cell">{task.description || '-'}</td>
                          <td className="text-end">
                            {task.totalHours != null && task.totalHours !== '' ? `${Number(task.totalHours)} hrs` : '-'}
                          </td>
                          <td>
                            <span 
                              className="task-status-badge"
                              style={{
                                backgroundColor: task.status === 'completed' 
                                  ? '#10b981' 
                                  : task.status === 'in-progress' 
                                  ? '#2563eb' 
                                  : '#f59e0b',
                                color: '#ffffff',
                                border: 'none'
                              }}
                            >
                              {getTaskStatusLabel(task.status)}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="action-btn view-action-btn"
                                onClick={() => setViewTask(task)}
                                title="View task"
                              >
                                <EyeIcon />
                              </button>
                              {canEditTask(task) && (
                                <button
                                  className="action-btn edit-action-btn"
                                  onClick={() => handleEditTask(task.id)}
                                  title="Edit task"
                                >
                                  <EditIcon />
                                </button>
                              )}
                              {canDeleteTask(task) && (
                                <button
                                  className="action-btn delete-action-btn"
                                  onClick={() => deleteTask(task.id)}
                                  title="Delete task"
                                >
                                  <TrashIcon />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          </div>
        </div>

        {/* Task Detail Modal */}
      {viewTask && (
        <div className="modal-overlay" onClick={() => setViewTask(null)}>
          <div className="modal-content task-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Task Details</h2>
              <button className="modal-close-btn" onClick={() => setViewTask(null)}>
                <span>&times;</span>
              </button>
            </div>
            <div className="task-detail-body">
              <div className="task-detail-title-row">
                <div className="task-detail-avatar">
                  {viewTask.title ? viewTask.title.charAt(0).toUpperCase() : 'T'}
                </div>
                <h3 className="task-detail-title">{viewTask.title || 'Untitled Task'}</h3>
              </div>
              {viewTask.description ? (
                <div className="task-detail-section">
                  <div className="task-detail-label">
                    <FileIcon style={{ width: '18px', height: '18px', color: '#2563eb', flexShrink: 0 }} />
                    <span>Description</span>
                  </div>
                  <p className="task-detail-description">{viewTask.description}</p>
                </div>
              ) : null}
              <div className="task-detail-info-grid">
                <div className="task-detail-info-card">
                  <CalendarIcon style={{ width: '22px', height: '22px', color: '#2563eb', flexShrink: 0 }} />
                  <div>
                    <div className="task-detail-info-label">Start Date</div>
                    <div className="task-detail-info-value">
                      {viewTask.startDate
                        ? new Date(viewTask.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Not set'}
                    </div>
                  </div>
                </div>
                <div className="task-detail-info-card">
                  <CalendarIcon style={{ width: '22px', height: '22px', color: '#2563eb', flexShrink: 0 }} />
                  <div>
                    <div className="task-detail-info-label">Due Date</div>
                    <div className="task-detail-info-value">
                      {viewTask.dueDate
                        ? new Date(viewTask.dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Not set'}
                    </div>
                  </div>
                </div>
                <div className="task-detail-info-card">
                  <ClockIcon style={{ width: '22px', height: '22px', color: '#2563eb', flexShrink: 0 }} />
                  <div>
                    <div className="task-detail-info-label">Total Hours</div>
                    <div className="task-detail-info-value">{viewTask.totalHours ? `${viewTask.totalHours} hrs` : 'Not set'}</div>
                  </div>
                </div>
                <div className="task-detail-info-card">
                  <TargetIcon style={{ width: '22px', height: '22px', color: '#2563eb', flexShrink: 0 }} />
                  <div>
                    <div className="task-detail-info-label">Status</div>
                    <div className="task-detail-info-value">
                      <span
                        className="task-detail-status-badge"
                        style={{
                          backgroundColor: viewTask.status === 'completed' ? '#10b981' : viewTask.status === 'in-progress' ? '#2563eb' : '#f59e0b',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.8125rem',
                          fontWeight: 500
                        }}
                      >
                        {getTaskStatusLabel(viewTask.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {(taskUsers[viewTask.id] || []).length > 0 && (
                <div className="task-detail-section">
                  <div className="task-detail-label">
                    <UsersIcon style={{ width: '18px', height: '18px', color: '#2563eb', flexShrink: 0 }} />
                    <span>Assigned To</span>
                  </div>
                  <div className="task-detail-assigned-list">
                    {(taskUsers[viewTask.id] || []).map((u) => (
                      <span key={u.id} className="task-detail-assigned-chip">
                        {u.name || u.email}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {currentUser && canEditTask(viewTask) && (
                <div className="task-detail-actions">
                  <button
                    type="button"
                    className="task-detail-edit-btn"
                    onClick={() => {
                      setViewTask(null);
                      handleEditTask(viewTask.id);
                    }}
                  >
                    <EditIcon style={{ width: '18px', height: '18px' }} />
                    Edit Task
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        {/* Progress Update Modal */}
      {showProgressModal && (
        <div className="modal-overlay" onClick={() => setShowProgressModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Update Progress</h2>
              <button className="modal-close-btn" onClick={() => setShowProgressModal(false)}>
                <span>&times;</span>
              </button>
            </div>
            <form onSubmit={handleProgressSubmit} className="progress-form">
              <div className="form-group">
                <label htmlFor="progress">Progress Percentage</label>
                <input
                  type="number"
                  id="progress"
                  min="0"
                  max="100"
                  value={newProgress}
                  onChange={(e) => setNewProgress(parseInt(e.target.value) || 0)}
                  className="progress-input"
                />
                <div className="progress-preview">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${newProgress}%`, backgroundColor: getStatusColor(activity.status) }}
                    ></div>
                  </div>
                  <span className="progress-text">{newProgress}%</span>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowProgressModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityDetail;
