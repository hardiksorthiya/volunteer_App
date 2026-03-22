import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import {
  ArrowLeftIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  TargetIcon,
  CalendarIcon,
  LocationIcon,
  UsersIcon,
  ClockIcon,
  FileIcon,
  EyeIcon,
} from '../components/Icons';
import api from '../config/api';

const ActivityDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { activityId } = route.params || {};
  
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
  const [currentUser, setCurrentUser] = useState(null);
  const [taskUsers, setTaskUsers] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsersForAddTask, setSelectedUsersForAddTask] = useState([]);
  const [isAddTaskUserDropdownOpen, setIsAddTaskUserDropdownOpen] = useState(false);
  const [addTaskUserSearchQuery, setAddTaskUserSearchQuery] = useState('');
  const [selectedUsersForEditTask, setSelectedUsersForEditTask] = useState([]);
  const [isEditTaskUserDropdownOpen, setIsEditTaskUserDropdownOpen] = useState(false);
  const [editTaskUserSearchQuery, setEditTaskUserSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUser();
    if (activityId) {
      loadActivity();
    }
  }, [activityId]);

  // Recalculate progress when tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      const newProgress = calculateProgressFromTasks(tasks);
      setProgress(newProgress);
      
      // If all tasks are completed, update activity status
      if (tasks.every(task => task.completed || task.status === 'completed')) {
        setProgress(100);
        if (activity && activity.status !== 'completed') {
          setActivity(prev => ({
            ...prev,
            status: 'completed',
            progress: 100
          }));
        }
      }
    } else {
      setProgress(0);
    }
  }, [tasks]);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setCurrentUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

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
      const response = await api.get(`/activities/${activityId}`);
      
      if (response.data.success) {
        const apiActivity = response.data.data;
        // Use API status when provided (includes task-based completion), else fallback to dates
        const status = apiActivity.status || getStatusFromDates(apiActivity.start_date, apiActivity.end_date);
        const progress = calculateProgress(apiActivity.start_date, apiActivity.end_date, status);
        
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
          creator_user_type: apiActivity.creator_user_type || null,
          participants: apiActivity.participants || [],
          createdAt: apiActivity.created_at
        };
        
        setActivity(mappedActivity);
        setProgress(progress);
        
        // Fetch all users for task assignment (only if user is admin or activity creator)
        const user = JSON.parse(await AsyncStorage.getItem('user') || '{}');
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
        
        await loadTasks();
      } else {
        Alert.alert('Error', 'Failed to load activity');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
      if (error.response?.status === 404 || error.response?.status === 403) {
        Alert.alert('Error', 'Activity not found');
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to load activity');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoinActivity = async () => {
    try {
      const response = await api.post(`/activities/${activityId}/join`);
      if (response.data.success) {
        await loadActivity();
        Alert.alert('Success', 'Successfully joined the activity!');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to join activity. Please try again.');
      }
    } catch (error) {
      console.error('Error joining activity:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to join activity. Please try again.');
    }
  };

  const handleLeaveActivity = () => {
    Alert.alert(
      'Leave Activity',
      'Are you sure you want to leave this activity?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.post(`/activities/${activityId}/leave`);
              if (response.data.success) {
                await loadActivity();
                Alert.alert('Success', 'Successfully left the activity.');
              } else {
                Alert.alert('Error', response.data.message || 'Failed to leave activity. Please try again.');
              }
            } catch (error) {
              console.error('Error leaving activity:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to leave activity. Please try again.');
            }
          },
        },
      ]
    );
  };

  const loadTasks = async () => {
    try {
      const response = await api.get(`/activities/${activityId}/tasks`);
      if (response.data.success) {
        const mappedTasks = response.data.data.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          startDate: task.start_date ? task.start_date.split('T')[0] : '',
          dueDate: task.due_date ? task.due_date.split('T')[0] : '',
          totalHours: task.total_hours != null && task.total_hours !== '' ? String(task.total_hours) : '',
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
        
        // If all tasks are completed, update activity status (use functional update to avoid stale closure)
        if (mappedTasks.length > 0 && mappedTasks.every(task => task.completed || task.status === 'completed')) {
          setProgress(100);
          setActivity(prev => (prev && prev.status !== 'completed' ? { ...prev, status: 'completed', progress: 100 } : prev));
        }
        
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
      const response = await api.get(`/activities/${activityId}/tasks/${taskId}/users`);
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
      // 403 expected when non-admin (e.g. volunteer creator) - use empty list for task assignment
      if (error.response?.status === 403) {
        setAllUsers([]);
        return;
      }
      console.error('Error fetching users:', error);
    }
  };

  const handleTaskInputChange = (name, value) => {
    setTaskFormData({
      ...taskFormData,
      [name]: value
    });
  };

  const handleAddTask = async () => {
    if (!taskFormData.title.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }

    try {
      const taskData = {
        title: taskFormData.title.trim(),
        description: taskFormData.description.trim() || null,
        start_date: taskFormData.startDate || null,
        due_date: taskFormData.dueDate || null,
        total_hours: taskFormData.totalHours ? parseInt(taskFormData.totalHours) : null,
        status: taskFormData.status || 'in-progress'
      };

      const response = await api.post(`/activities/${activityId}/tasks`, taskData);
      
      if (response.data.success) {
        // Add users to task if selected (only for admin-created activities; volunteer activities have no assign-user feature)
        if (activity.creator_user_type !== 'volunteer' && selectedUsersForAddTask.length > 0) {
          for (const userId of selectedUsersForAddTask) {
            try {
              await api.post(`/activities/${activityId}/tasks/${response.data.data.id}/users`, {
                user_id: userId
              });
            } catch (error) {
              console.error(`Error adding user ${userId} to task:`, error);
            }
          }
        }
        
        // Reset form first
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
        
        Alert.alert('Success', 'Task added successfully');
      } else {
        Alert.alert('Error', 'Failed to add task. Please try again.');
      }
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to add task. Please try again.');
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
        totalHours: task.totalHours != null && task.totalHours !== '' ? String(task.totalHours) : '',
        status: task.status
      });
      
      const currentTaskUsers = taskUsers[taskId] || [];
      setSelectedUsersForEditTask(currentTaskUsers.map(tu => String(tu.user_id)));
      setEditTaskUserSearchQuery('');
      setIsEditTaskUserDropdownOpen(false);
    }
  };

  const handleEditTaskInputChange = (name, value) => {
    setEditTaskData({
      ...editTaskData,
      [name]: value
    });
  };

  const handleSaveEdit = async () => {
    if (!editTaskData.title.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }

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

      const response = await api.put(`/activities/${activityId}/tasks/${editingTaskId}`, taskData);
      
      if (response.data.success) {
        // Only update assigned users for admin-created activities (volunteer activities have no assign-user feature)
        if (activity.creator_user_type !== 'volunteer') {
          const currentTaskUsers = taskUsers[editingTaskId] || [];
          const currentUserIds = currentTaskUsers.map(tu => String(tu.user_id));
          const usersToAdd = selectedUsersForEditTask.filter(id => !currentUserIds.includes(id));
          const usersToRemove = currentUserIds.filter(id => !selectedUsersForEditTask.includes(id));
          for (const userId of usersToRemove) {
            try {
              await api.delete(`/activities/${activityId}/tasks/${editingTaskId}/users/${userId}`);
            } catch (error) {
              console.error(`Error removing user ${userId} from task:`, error);
            }
          }
          for (const userId of usersToAdd) {
            try {
              await api.post(`/activities/${activityId}/tasks/${editingTaskId}/users`, {
                user_id: userId
              });
            } catch (error) {
              console.error(`Error adding user ${userId} to task:`, error);
            }
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
        
        Alert.alert('Success', 'Task updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update task. Please try again.');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update task. Please try again.');
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
    setSelectedUsersForEditTask([]);
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

  const deleteTask = (taskId) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/activities/${activityId}/tasks/${taskId}`);
              
              if (response.data.success) {
                // Reload tasks from API (updates progress and activity status when all tasks completed)
                await loadTasks();
                Alert.alert('Success', 'Task deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete task. Please try again.');
              }
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete task. Please try again.');
            }
          },
        },
      ]
    );
  };

  const updateProgress = (newProgressValue) => {
    setProgress(newProgressValue);
    setActivity(prev => (prev ? { ...prev, progress: newProgressValue } : prev));
  };

  const handleProgressSubmit = () => {
    if (newProgress >= 0 && newProgress <= 100) {
      updateProgress(newProgress);
      setShowProgressModal(false);
      setNewProgress(progress);
      Alert.alert('Success', 'Progress updated successfully');
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

  const isAdmin = currentUser && (currentUser.role === 0 || currentUser.user_type === 'admin');
  const canEdit = isAdmin || (activity && activity.created_by === currentUser?.id);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Header onNotificationPress={() => {}} />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.container}>
        <Header onNotificationPress={() => {}} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Activity not found</Text>
        </View>
      </View>
    );
  }

  const renderTask = (task) => {
    const taskStatusColor = getTaskStatusColor(task.status);
    
    return (
      <View style={styles.taskCard}>
        {editingTaskId === task.id ? (
          <View style={styles.editTaskForm}>
            <TextInput
              style={styles.input}
              placeholder="Task Title *"
              value={editTaskData.title}
              onChangeText={(value) => handleEditTaskInputChange('title', value)}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              multiline
              numberOfLines={3}
              value={editTaskData.description}
              onChangeText={(value) => handleEditTaskInputChange('description', value)}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Start Date (YYYY-MM-DD)"
                value={editTaskData.startDate}
                onChangeText={(value) => handleEditTaskInputChange('startDate', value)}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Due Date (YYYY-MM-DD)"
                value={editTaskData.dueDate}
                onChangeText={(value) => handleEditTaskInputChange('dueDate', value)}
              />
            </View>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Total Hours"
                keyboardType="numeric"
                value={editTaskData.totalHours}
                onChangeText={(value) => handleEditTaskInputChange('totalHours', value)}
              />
              <View style={[styles.input, styles.halfInput, styles.selectContainer]}>
                <Text style={styles.selectLabel}>Status:</Text>
                <View style={styles.statusButtons}>
                  {['in-progress', 'completed'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        editTaskData.status === status && styles.statusButtonActive,
                        { borderColor: getTaskStatusColor(status) }
                      ]}
                      onPress={() => handleEditTaskInputChange('status', status)}
                    >
                      <Text style={[
                        styles.statusButtonText,
                        editTaskData.status === status && { color: getTaskStatusColor(status) }
                      ]}>
                        {getTaskStatusLabel(status)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            {currentUser && (currentUser.role === 0 || currentUser.user_type === 'admin') && activity.creator_user_type !== 'volunteer' ? (
              <View style={styles.userSelectionContainer}>
                <Text style={styles.label}>Assign Users (Optional)</Text>
                <TouchableOpacity
                  style={styles.userDropdownTrigger}
                  onPress={() => setIsEditTaskUserDropdownOpen(!isEditTaskUserDropdownOpen)}
                >
                  <Text style={styles.userDropdownText}>
                    {selectedUsersForEditTask.length > 0
                      ? `${selectedUsersForEditTask.length} user(s) selected`
                      : 'Click to select users...'}
                  </Text>
                </TouchableOpacity>
                {isEditTaskUserDropdownOpen ? (
                  <View style={styles.userDropdown}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search users..."
                      value={editTaskUserSearchQuery}
                      onChangeText={setEditTaskUserSearchQuery}
                    />
                    <ScrollView style={styles.userList}>
                      {allUsers
                        .filter(u => {
                          const searchLower = editTaskUserSearchQuery.toLowerCase();
                          return u.name.toLowerCase().includes(searchLower) || 
                                 u.email.toLowerCase().includes(searchLower);
                        })
                        .map((u) => {
                          const isSelected = selectedUsersForEditTask.includes(String(u.id));
                          return (
                            <TouchableOpacity
                              key={u.id}
                              style={[styles.userItem, isSelected && styles.userItemSelected]}
                              onPress={() => {
                                if (isSelected) {
                                  setSelectedUsersForEditTask(selectedUsersForEditTask.filter(id => id !== String(u.id)));
                                } else {
                                  setSelectedUsersForEditTask([...selectedUsersForEditTask, String(u.id)]);
                                }
                              }}
                            >
                              <Text style={styles.userItemName}>{u.name}</Text>
                              <Text style={styles.userItemEmail}>{u.email}</Text>
                            </TouchableOpacity>
                          );
                        })}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            ) : null}
            <View style={styles.taskFormActions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.submitButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.taskHeader}>
              <View style={styles.taskTitleRow}>
                <View style={[styles.taskAvatar, { backgroundColor: taskStatusColor + '20' }]}>
                  <Text style={[styles.taskAvatarText, { color: taskStatusColor }]}>
                    {task.title ? task.title.charAt(0).toUpperCase() : 'T'}
                  </Text>
                </View>
                <View style={styles.taskTitleContainer}>
                  <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                    {task.title}
                  </Text>
                  <View style={[styles.taskStatusBadge, { backgroundColor: taskStatusColor + '20' }]}>
                    <Text style={[styles.taskStatusBadgeText, { color: taskStatusColor }]}>
                      {getTaskStatusLabel(task.status)}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.taskActions}>
                <TouchableOpacity
                  style={styles.taskActionButton}
                  onPress={() => {
                    // View task details - could open a modal or navigate
                    console.log('View task:', task);
                    Alert.alert('Task Details', `${task.title}\n\n${task.description || 'No description'}`);
                  }}
                >
                  <EyeIcon size={18} color="#2563eb" />
                </TouchableOpacity>
                {canEditTask(task) && (
                  <TouchableOpacity
                    style={styles.taskActionButton}
                    onPress={() => handleEditTask(task.id)}
                  >
                    <EditIcon size={18} color="#2563eb" />
                  </TouchableOpacity>
                )}
                {canDeleteTask(task) && (
                  <TouchableOpacity
                    style={styles.taskActionButton}
                    onPress={() => deleteTask(task.id)}
                  >
                    <TrashIcon size={18} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {task.description ? (
              <Text style={styles.taskDescription}>{task.description}</Text>
            ) : null}
            <View style={styles.taskInfo}>
              <View style={styles.taskInfoRow}>
                <Text style={styles.taskInfoText}>
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
                </Text>
              </View>
              {task.description ? (
                <Text style={styles.taskDescriptionCell}>{task.description || '-'}</Text>
              ) : null}
              <View style={[styles.taskStatusBadgeInline, { 
                backgroundColor: task.status === 'completed' 
                  ? '#10b981' 
                  : task.status === 'in-progress' 
                  ? '#2563eb' 
                  : '#f59e0b',
                alignSelf: 'flex-start',
              }]}>
                <Text style={styles.taskStatusBadgeInlineText}>
                  {getTaskStatusLabel(task.status)}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header onNotificationPress={() => {}} />
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await Promise.all([
                  loadActivity(),
                  loadTasks(),
                ]);
              } catch (error) {
                console.error('Error refreshing:', error);
              } finally {
                setRefreshing(false);
              }
            }}
            colors={['#2563eb']}
            tintColor="#2563eb"
            title="Pull to refresh"
            titleColor="#6b7280"
          />
        }
      >
        {/* Page Header with Gradient */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderContent}>
            <View style={styles.pageHeaderLeft}>
              <Text style={styles.pageHeaderTitle}>{activity.title}</Text>
              <View style={styles.pageHeaderBadges}>
                <View style={[styles.pageHeaderStatusBadge, { 
                  backgroundColor: activity.status === 'ongoing' ? '#d1fae5' : (getStatusColor(activity.status) + '20'),
                  borderColor: activity.status === 'ongoing' ? '#10b981' : 'transparent',
                  borderWidth: activity.status === 'ongoing' ? 1 : 0
                }]}>
                  <Text style={[styles.pageHeaderStatusBadgeText, { color: getStatusColor(activity.status) }]}>
                    {getStatusLabel(activity.status)}
                  </Text>
                </View>
                {activity.category ? (
                  <View style={styles.pageHeaderCategoryBadge}>
                    <Text style={styles.pageHeaderCategoryBadgeText}>{activity.category}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.pageHeaderActions}>
              {/* Join/Leave button for regular users on public activities */}
              {currentUser && !isAdmin && (activity.is_public === true || activity.is_public === 1) ? (
                <>
                  {!(activity.is_joined === true || activity.is_joined === 1) ? (
                    <TouchableOpacity
                      style={styles.pageHeaderActionButton}
                      onPress={handleJoinActivity}
                    >
                      <PlusIcon size={18} color="#ffffff" />
                      <Text style={styles.pageHeaderActionButtonText}>Join Activity</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.pageHeaderActionButton, styles.leaveButton]}
                      onPress={handleLeaveActivity}
                    >
                      <CheckIcon size={18} color="#ffffff" />
                      <Text style={styles.pageHeaderActionButtonText}>Leave Activity</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : null}
              {canEdit ? (
                <TouchableOpacity
                  style={[styles.pageHeaderActionButton, styles.editButton]}
                  onPress={() => {
                    console.log('Navigating to EditActivity with activityId:', activityId);
                    navigation.navigate('EditActivity', { activityId });
                  }}
                >
                  <EditIcon size={18} color="#1f2937" />
                  <Text style={[styles.pageHeaderActionButtonText, styles.editButtonText]}>Edit</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.pageHeaderActionButton, styles.backButtonHeader]}
                onPress={() => navigation.goBack()}
              >
                <ArrowLeftIcon size={18} color="#1f2937" />
                <Text style={[styles.pageHeaderActionButtonText, styles.backButtonTextHeader]}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Activity Info Card */}
        <View style={styles.activityCard}>
          {activity.description ? (
            <Text style={styles.activityDescription}>{activity.description}</Text>
          ) : null}

          <View style={styles.activityInfoGrid}>
            <View style={styles.activityInfoItem}>
              <CalendarIcon size={24} color="#2563eb" />
              <View style={styles.activityInfoContent}>
                <Text style={styles.activityInfoLabel}>Date</Text>
                <Text style={styles.activityInfoValue}>
                  {activity.start_date ? new Date(activity.start_date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Not set'}
                </Text>
              </View>
            </View>

            {activity.location ? (
              <View style={styles.activityInfoItem}>
                <LocationIcon size={24} color="#2563eb" />
                <View style={styles.activityInfoContent}>
                  <Text style={styles.activityInfoLabel}>Location</Text>
                  <Text style={styles.activityInfoValue}>{activity.location || 'Not specified'}</Text>
                </View>
              </View>
            ) : null}

            {!(activity.creator_user_type === 'volunteer' || (currentUser && activity.created_by === currentUser.id)) ? (
              <View style={styles.activityInfoItem}>
                <UsersIcon size={24} color="#2563eb" />
                <View style={styles.activityInfoContent}>
                  <Text style={styles.activityInfoLabel}>Volunteers</Text>
                  <Text style={styles.activityInfoValue}>
                    {activity.volunteers} {activity.maxVolunteers ? `/ ${activity.maxVolunteers}` : ''}
                    {!activity.maxVolunteers && activity.volunteers === 1 ? ' volunteer' : ''}
                    {!activity.maxVolunteers && activity.volunteers !== 1 ? ' volunteers' : ''}
                  </Text>
                </View>
              </View>
            ) : null}

            {activity.organization ? (
              <View style={styles.activityInfoItem}>
                <View style={styles.activityInfoContent}>
                  <Text style={styles.activityInfoLabel}>Organization</Text>
                  <Text style={styles.activityInfoValue}>{activity.organization}</Text>
                </View>
              </View>
            ) : null}
          </View>

          {(activity.status === 'ongoing' || activity.status === 'completed') && tasks.length > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Overall Progress</Text>
                <Text style={[styles.progressPercentage, { color: getStatusColor(activity.status) }]}>{progress}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${progress}%`, 
                      backgroundColor: getStatusColor(activity.status),
                      borderRadius: 10,
                    }
                  ]} 
                />
              </View>
            </View>
          )}
        </View>

        {/* Tasks Section */}
        <View style={styles.tasksSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tasks</Text>
            {canAddTask() && (
              <TouchableOpacity
                style={styles.addTaskButton}
                onPress={() => setShowAddTask(true)}
              >
                <PlusIcon size={18} color="#ffffff" />
                <Text style={styles.addTaskButtonText}>Add Task</Text>
              </TouchableOpacity>
            )}
          </View>

          {showAddTask && (
            <View style={styles.addTaskForm}>
              <TextInput
                style={styles.input}
                placeholder="Task Title *"
                value={taskFormData.title}
                onChangeText={(value) => handleTaskInputChange('title', value)}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                multiline
                numberOfLines={3}
                value={taskFormData.description}
                onChangeText={(value) => handleTaskInputChange('description', value)}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Start Date (YYYY-MM-DD)"
                  value={taskFormData.startDate}
                  onChangeText={(value) => handleTaskInputChange('startDate', value)}
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Due Date (YYYY-MM-DD)"
                  value={taskFormData.dueDate}
                  onChangeText={(value) => handleTaskInputChange('dueDate', value)}
                />
              </View>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Total Hours"
                  keyboardType="numeric"
                  value={taskFormData.totalHours}
                  onChangeText={(value) => handleTaskInputChange('totalHours', value)}
                />
                <View style={[styles.input, styles.halfInput, styles.selectContainer]}>
                  <Text style={styles.selectLabel}>Status:</Text>
                  <View style={styles.statusButtons}>
                    {['in-progress', 'completed'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusButton,
                          taskFormData.status === status && styles.statusButtonActive,
                          { borderColor: getTaskStatusColor(status) }
                        ]}
                        onPress={() => handleTaskInputChange('status', status)}
                      >
                        <Text style={[
                          styles.statusButtonText,
                          taskFormData.status === status && { color: getTaskStatusColor(status) }
                        ]}>
                          {getTaskStatusLabel(status)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              {currentUser && (currentUser.role === 0 || currentUser.user_type === 'admin') && activity.creator_user_type !== 'volunteer' ? (
                <View style={styles.userSelectionContainer}>
                  <Text style={styles.label}>Assign Users (Optional)</Text>
                  <TouchableOpacity
                    style={styles.userDropdownTrigger}
                    onPress={() => setIsAddTaskUserDropdownOpen(!isAddTaskUserDropdownOpen)}
                  >
                    <Text style={styles.userDropdownText}>
                      {selectedUsersForAddTask.length > 0
                        ? `${selectedUsersForAddTask.length} user(s) selected`
                        : 'Click to select users...'}
                    </Text>
                  </TouchableOpacity>
                  {isAddTaskUserDropdownOpen ? (
                    <View style={styles.userDropdown}>
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search users..."
                        value={addTaskUserSearchQuery}
                        onChangeText={setAddTaskUserSearchQuery}
                      />
                      <ScrollView style={styles.userList}>
                        {allUsers
                          .filter(u => {
                            const searchLower = addTaskUserSearchQuery.toLowerCase();
                            return u.name.toLowerCase().includes(searchLower) || 
                                   u.email.toLowerCase().includes(searchLower);
                          })
                          .map((u) => {
                            const isSelected = selectedUsersForAddTask.includes(String(u.id));
                            return (
                              <TouchableOpacity
                                key={u.id}
                                style={[styles.userItem, isSelected && styles.userItemSelected]}
                                onPress={() => {
                                  if (isSelected) {
                                    setSelectedUsersForAddTask(selectedUsersForAddTask.filter(id => id !== String(u.id)));
                                  } else {
                                    setSelectedUsersForAddTask([...selectedUsersForAddTask, String(u.id)]);
                                  }
                                }}
                              >
                                <Text style={styles.userItemName}>{u.name}</Text>
                                <Text style={styles.userItemEmail}>{u.email}</Text>
                              </TouchableOpacity>
                            );
                          })}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>
              ) : null}
              <View style={styles.taskFormActions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
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
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.submitButton]}
                  onPress={handleAddTask}
                >
                  <Text style={styles.submitButtonText}>Add Task</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {tasks.length === 0 ? (
            <View style={styles.emptyTasks}>
              <Text style={styles.emptyTasksText}>No tasks yet. Add your first task to get started!</Text>
            </View>
          ) : (
            <View style={styles.tasksList}>
              {tasks.map((task) => (
                <View key={`task-${task.id}`} style={{ marginBottom: 12 }}>
                  {renderTask(task)}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Progress Update Modal */}
      <Modal
        visible={showProgressModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProgressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Progress</Text>
            <TextInput
              style={styles.progressInput}
              placeholder="Progress Percentage (0-100)"
              keyboardType="numeric"
              value={newProgress.toString()}
              onChangeText={(value) => setNewProgress(parseInt(value) || 0)}
            />
            <View style={styles.progressPreview}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${newProgress}%`, 
                      backgroundColor: getStatusColor(activity.status) 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>{newProgress}%</Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowProgressModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleProgressSubmit}
              >
                <Text style={styles.submitButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
  },
  content: {
    padding: 16,
  },
  // Page Header with Gradient
  pageHeader: {
    backgroundColor: '#1e3a8a',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pageHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  pageHeaderLeft: {
    flex: 1,
    minWidth: 200,
  },
  pageHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  pageHeaderBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  pageHeaderStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pageHeaderStatusBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pageHeaderCategoryBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pageHeaderCategoryBadgeText: {
    fontSize: 14,
    color: '#1f2937',
  },
  pageHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  pageHeaderActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    backgroundColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  pageHeaderActionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  backButtonHeader: {
    backgroundColor: '#ffffff',
  },
  backButtonTextHeader: {
    color: '#1f2937',
  },
  editButton: {
    backgroundColor: '#ffffff',
  },
  editButtonText: {
    color: '#1f2937',
  },
  leaveButton: {
    backgroundColor: '#ef4444',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
    backgroundColor: '#eff6ff',
  },
  backButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  headerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  joinButton: {
    backgroundColor: '#10b981',
  },
  progressButton: {
    backgroundColor: '#f59e0b',
  },
  headerActionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  activityDescription: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    marginBottom: 16,
  },
  activityInfoGrid: {
    gap: 12,
    marginBottom: 16,
  },
  activityInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  activityInfoContent: {
    flex: 1,
  },
  activityInfoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  activityInfoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  progressSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
  },
  tasksSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  addTaskButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  addTaskForm: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
  },
  selectContainer: {
    borderWidth: 0,
    padding: 0,
    marginBottom: 0,
  },
  selectLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#ffffff',
  },
  statusButtonActive: {
    backgroundColor: '#eff6ff',
  },
  statusButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
  },
  userSelectionContainer: {
    marginBottom: 12,
  },
  userDropdownTrigger: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  userDropdownText: {
    fontSize: 16,
    color: '#1f2937',
  },
  userDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    maxHeight: 200,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    margin: 8,
  },
  userList: {
    maxHeight: 150,
  },
  userItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userItemSelected: {
    backgroundColor: '#eff6ff',
  },
  userItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  userItemEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  taskFormActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#2563eb',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  tasksList: {
    // gap: 12, // Not supported in all RN versions
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  taskAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskAvatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  taskTitleContainer: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  taskStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  taskStatusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  taskActionButton: {
    padding: 8,
  },
  taskDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  taskInfo: {
    gap: 8,
    marginTop: 8,
  },
  taskInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskInfoText: {
    fontSize: 14,
    color: '#1f2937',
  },
  taskDescriptionCell: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  taskStatusBadgeInline: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  taskStatusBadgeInlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  editTaskForm: {
    marginTop: 8,
  },
  emptyTasks: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTasksText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 20,
  },
  progressInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 16,
  },
  progressPreview: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    textAlign: 'center',
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default ActivityDetailScreen;

