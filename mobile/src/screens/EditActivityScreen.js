import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeftIcon,
  CalendarIcon,
  MapPinIcon,
  LocationIcon,
  UsersIcon,
  ClockIcon,
  TagIcon,
  BuildingIcon,
  InfoIcon,
  PlusIcon,
  CheckIcon,
} from '../components/Icons';
import Header from '../components/Header';

const EditActivityScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { activityId } = route.params || {};
  
  // Debug log
  console.log('✅ EditActivityScreen loaded with activityId:', activityId);
  console.log('✅ Route params:', route.params);
  
  // If no activityId, this is an error - should not happen
  if (!activityId) {
    console.error('❌ ERROR: EditActivityScreen loaded without activityId!');
  }
  const [user, setUser] = useState(null);
  const isAdminUser = user && (Number(user.role) === 0 || user.user_type === 'admin');
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [initialSelectedUsers, setInitialSelectedUsers] = useState([]);
  const [participantUsersMap, setParticipantUsersMap] = useState({});
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
    contact_email: '',
    contact_phone: '',
    requirements: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());

  useEffect(() => {
    const loadData = async () => {
      await fetchUser();
      if (activityId) {
        await fetchActivity();
      } else {
        // If no activityId, show error and go back
        setErrorMessage('Activity ID is required');
        setLoading(false);
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      }
    };
    loadData();
  }, [activityId]);

  useEffect(() => {
    // Only fetch users if user is admin
    if (isAdminUser) {
      fetchAllUsers();
    }
  }, [isAdminUser]);

  useEffect(() => {
    // If the user is not admin, make sure selections are cleared
    if (user && !isAdminUser) {
      setSelectedUsers([]);
      setIsUserDropdownOpen(false);
      setUserSearchQuery('');
    }
  }, [user, isAdminUser]);

  const fetchUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const response = await api.get('/users/me');
      if (response.data.success) {
        setUser(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      navigation.navigate('Login');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await api.get('/users');
      if (response.data.success) {
        const userData = await AsyncStorage.getItem('user');
        const currentUser = userData ? JSON.parse(userData) : null;
        const filteredUsers = (response.data.data || []).filter(
          (u) => u.is_active && (!currentUser || u.id !== currentUser.id)
        );
        setAllUsers(filteredUsers);
      }
    } catch (error) {
      // Silently handle 403 (Forbidden) errors - expected for non-admin users
      // Only log other errors
      if (error.response?.status !== 403) {
        console.error('Error fetching users:', error);
      }
      // Set empty array if user doesn't have permission
      setAllUsers([]);
    }
  };

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/activities/${activityId}`);
      if (response.data.success) {
        const activity = response.data.data;
        
        // Check permission - only admin or creator can edit
        const userData = await AsyncStorage.getItem('user');
        const currentUser = userData ? JSON.parse(userData) : null;
        const isAdmin = currentUser && (currentUser.role === 0 || currentUser.user_type === 'admin');
        if (!isAdmin && activity.created_by !== currentUser?.id) {
          setErrorMessage('You do not have permission to edit this activity');
          setTimeout(() => {
            navigation.goBack();
          }, 2000);
          return;
        }

        // Parse start_date and end_date to separate date and time
        const startDateObj = activity.start_date ? new Date(activity.start_date) : null;
        const endDateObj = activity.end_date ? new Date(activity.end_date) : null;

        setFormData({
          title: activity.title || '',
          description: activity.description || '',
          category: activity.category || '',
          organization_name: activity.organization_name || '',
          location: activity.location || '',
          start_date: startDateObj ? formatDate(startDateObj) : '',
          start_time: startDateObj ? formatTime(startDateObj) : '',
          end_date: endDateObj ? formatDate(endDateObj) : '',
          end_time: endDateObj ? formatTime(endDateObj) : '',
          max_participants: activity.max_participants ? String(activity.max_participants) : '',
          contact_email: activity.contact_email || '',
          contact_phone: activity.contact_phone || '',
          requirements: activity.requirements || '',
        });

        // Set date/time picker values
        if (startDateObj) {
          setStartDate(startDateObj);
          setStartTime(startDateObj);
        }
        if (endDateObj) {
          setEndDate(endDateObj);
          setEndTime(endDateObj);
        }

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
          navigation.goBack();
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
        navigation.goBack();
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleInputChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleStartDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
      handleInputChange('start_date', formatDate(selectedDate));
    }
  };

  const handleStartTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }
    if (selectedTime) {
      setStartTime(selectedTime);
      handleInputChange('start_time', formatTime(selectedTime));
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (selectedDate) {
      setEndDate(selectedDate);
      handleInputChange('end_date', formatDate(selectedDate));
    }
  };

  const handleEndTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
    }
    if (selectedTime) {
      setEndTime(selectedTime);
      handleInputChange('end_time', formatTime(selectedTime));
    }
  };

  const handleSubmit = async () => {
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
      // Build start_date in MySQL format (YYYY-MM-DD HH:mm:ss) so backend accepts it reliably
      let startDateTime = null;
      if (formData.start_date && formData.start_time) {
        const t = formData.start_time.trim();
        const timePart = t.length === 5 ? `${t}:00` : t; // "10:00" -> "10:00:00"
        startDateTime = `${formData.start_date.trim()} ${timePart}`;
      }

      // Build end_date in MySQL format
      let endDateTime = null;
      if (formData.end_date) {
        const endTime = (formData.end_time || '23:59').trim();
        const timePart = endTime.length === 5 ? `${endTime}:00` : endTime;
        endDateTime = `${formData.end_date.trim()} ${timePart}`;
      }

      const activityData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category.trim() || null,
        organization_name: formData.organization_name.trim() || null,
        location: formData.location.trim() || null,
        start_date: startDateTime,
        end_date: endDateTime || null,
        max_participants: formData.max_participants
          ? parseInt(formData.max_participants, 10)
          : null,
        contact_email: formData.contact_email.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        requirements: formData.requirements.trim() || null,
      };

      // Only send participant_ids if user is admin and selections have changed
      if (isAdminUser) {
        // Check if selectedUsers has changed from initial
        const selectedIds = selectedUsers.map(id => parseInt(id)).sort();
        const initialIds = initialSelectedUsers.map(id => parseInt(id)).sort();
        const hasChanged = JSON.stringify(selectedIds) !== JSON.stringify(initialIds);
        
        if (hasChanged) {
          activityData.participant_ids = selectedIds;
        }
      }

      const response = await api.put(`/activities/${activityId}`, activityData);

      if (response.data.success) {
        setSuccessMessage('Activity updated successfully!');
        setErrorMessage('');
        Alert.alert(
          'Success',
          'Activity updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('MainTabs', { screen: 'Activity' });
              },
            },
          ]
        );
      } else {
        setErrorMessage(
          response.data.message || 'Failed to update activity'
        );
      }
    } catch (error) {
      console.error('Error updating activity:', error);
      const errorMsg =
        error.response?.data?.message ||
        (error.response?.status === 400 && 'Invalid data. Check dates and required fields.') ||
        'Failed to update activity. Please try again.';
      setErrorMessage(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserSelection = (userId) => {
    const userIdStr = String(userId);
    if (selectedUsers.includes(userIdStr)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userIdStr));
    } else {
      setSelectedUsers([...selectedUsers, userIdStr]);
    }
  };

  const filteredUsers = allUsers.filter((u) => {
    const searchLower = userSearchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Header />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card with Gradient-like styling */}
        <View style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Edit Activity</Text>
              <Text style={styles.headerSubtitle}>Update activity details and information</Text>
            </View>
            <TouchableOpacity
              style={styles.backButtonHeader}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeftIcon size={20} color="#1e3a8a" />
              <Text style={styles.backButtonTextHeader}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Success/Error Messages */}
        {successMessage ? (
          <View style={styles.alertSuccess}>
            <CheckIcon size={20} color="#10b981" />
            <Text style={styles.alertTextSuccess}>{successMessage}</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.alertError}>
            <InfoIcon size={20} color="#ef4444" />
            <Text style={styles.alertTextError}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Basic Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <InfoIcon size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Basic Information</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Activity Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                formErrors.title && styles.inputError,
              ]}
              value={formData.title}
              onChangeText={(value) => handleInputChange('title', value)}
              placeholder="e.g., Community Cleanup Day"
              editable={!submitting}
            />
            {formErrors.title && (
              <Text style={styles.errorText}>{formErrors.title}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[
                styles.textArea,
                formErrors.description && styles.inputError,
              ]}
              value={formData.description}
              onChangeText={(value) =>
                handleInputChange('description', value)
              }
              placeholder="Provide a detailed description of the activity..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!submitting}
            />
            {formErrors.description && (
              <Text style={styles.errorText}>
                {formErrors.description}
              </Text>
            )}
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, styles.formGroupHalf]}>
              <Text style={styles.label}>Category</Text>
              <TextInput
                style={[
                  styles.input,
                  formErrors.category && styles.inputError,
                ]}
                value={formData.category}
                onChangeText={(value) =>
                  handleInputChange('category', value)
                }
                placeholder="e.g., Environment"
                editable={!submitting}
              />
            </View>

            <View style={[styles.formGroup, styles.formGroupHalf]}>
              <Text style={styles.label}>Organization</Text>
              <TextInput
                style={[
                  styles.input,
                  formErrors.organization_name && styles.inputError,
                ]}
                value={formData.organization_name}
                onChangeText={(value) =>
                  handleInputChange('organization_name', value)
                }
                placeholder="e.g., Green Earth"
                editable={!submitting}
              />
            </View>
          </View>
        </View>

        {/* Location & Contact Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LocationIcon size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Location & Contact</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={[
                styles.input,
                formErrors.location && styles.inputError,
              ]}
              value={formData.location}
              onChangeText={(value) =>
                handleInputChange('location', value)
              }
              placeholder="e.g., Central Park, New York"
              editable={!submitting}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, styles.formGroupHalf]}>
              <Text style={styles.label}>Contact Email</Text>
              <TextInput
                style={[
                  styles.input,
                  formErrors.contact_email && styles.inputError,
                ]}
                value={formData.contact_email}
                onChangeText={(value) =>
                  handleInputChange('contact_email', value)
                }
                placeholder="contact@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!submitting}
              />
            </View>

            <View style={[styles.formGroup, styles.formGroupHalf]}>
              <Text style={styles.label}>Contact Phone</Text>
              <TextInput
                style={[
                  styles.input,
                  formErrors.contact_phone && styles.inputError,
                ]}
                value={formData.contact_phone}
                onChangeText={(value) =>
                  handleInputChange('contact_phone', value)
                }
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
                editable={!submitting}
              />
            </View>
          </View>
        </View>

        {/* Schedule Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CalendarIcon size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Schedule</Text>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, styles.formGroupHalf]}>
              <Text style={styles.label}>
                Start Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateTimeInput,
                  formErrors.start_date && styles.inputError,
                ]}
                onPress={() => !submitting && setShowStartDatePicker(true)}
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.dateTimeText,
                    !formData.start_date && styles.placeholderText,
                  ]}
                >
                  {formData.start_date || 'Select start date'}
                </Text>
              </TouchableOpacity>
              {formErrors.start_date && (
                <Text style={styles.errorText}>
                  {formErrors.start_date}
                </Text>
              )}
              {showStartDatePicker && (
                <>
                  {Platform.OS === 'ios' && (
                    <Modal
                      transparent={true}
                      animationType="slide"
                      visible={showStartDatePicker}
                      onRequestClose={() => setShowStartDatePicker(false)}
                    >
                      <View style={styles.pickerModalContainer}>
                        <View style={styles.pickerModalContent}>
                          <View style={styles.pickerModalHeader}>
                            <TouchableOpacity
                              onPress={() => setShowStartDatePicker(false)}
                            >
                              <Text style={styles.pickerModalButton}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.pickerModalTitle}>Select Start Date</Text>
                            <TouchableOpacity
                              onPress={() => {
                                handleStartDateChange(null, startDate);
                                setShowStartDatePicker(false);
                              }}
                            >
                              <Text style={[styles.pickerModalButton, styles.pickerModalButtonPrimary]}>Done</Text>
                            </TouchableOpacity>
                          </View>
                          <DateTimePicker
                            value={startDate}
                            mode="date"
                            display="spinner"
                            onChange={(event, date) => {
                              if (date) setStartDate(date);
                            }}
                          />
                        </View>
                      </View>
                    </Modal>
                  )}
                  {Platform.OS === 'android' && (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="default"
                      onChange={handleStartDateChange}
                    />
                  )}
                </>
              )}
            </View>

            <View style={[styles.formGroup, styles.formGroupHalf]}>
              <Text style={styles.label}>
                Start Time <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateTimeInput,
                  formErrors.start_time && styles.inputError,
                ]}
                onPress={() => !submitting && setShowStartTimePicker(true)}
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.dateTimeText,
                    !formData.start_time && styles.placeholderText,
                  ]}
                >
                  {formData.start_time || 'Select start time'}
                </Text>
              </TouchableOpacity>
              {formErrors.start_time && (
                <Text style={styles.errorText}>
                  {formErrors.start_time}
                </Text>
              )}
              {showStartTimePicker && (
                <>
                  {Platform.OS === 'ios' && (
                    <Modal
                      transparent={true}
                      animationType="slide"
                      visible={showStartTimePicker}
                      onRequestClose={() => setShowStartTimePicker(false)}
                    >
                      <View style={styles.pickerModalContainer}>
                        <View style={styles.pickerModalContent}>
                          <View style={styles.pickerModalHeader}>
                            <TouchableOpacity
                              onPress={() => setShowStartTimePicker(false)}
                            >
                              <Text style={styles.pickerModalButton}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.pickerModalTitle}>Select Start Time</Text>
                            <TouchableOpacity
                              onPress={() => {
                                handleStartTimeChange(null, startTime);
                                setShowStartTimePicker(false);
                              }}
                            >
                              <Text style={[styles.pickerModalButton, styles.pickerModalButtonPrimary]}>Done</Text>
                            </TouchableOpacity>
                          </View>
                          <DateTimePicker
                            value={startTime}
                            mode="time"
                            display="spinner"
                            onChange={(event, time) => {
                              if (time) setStartTime(time);
                            }}
                            is24Hour={false}
                          />
                        </View>
                      </View>
                    </Modal>
                  )}
                  {Platform.OS === 'android' && (
                    <DateTimePicker
                      value={startTime}
                      mode="time"
                      display="default"
                      onChange={handleStartTimeChange}
                      is24Hour={false}
                    />
                  )}
                </>
              )}
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, styles.formGroupHalf]}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity
                style={[
                  styles.dateTimeInput,
                  formErrors.end_date && styles.inputError,
                ]}
                onPress={() => !submitting && setShowEndDatePicker(true)}
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.dateTimeText,
                    !formData.end_date && styles.placeholderText,
                  ]}
                >
                  {formData.end_date || 'Select end date'}
                </Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <>
                  {Platform.OS === 'ios' && (
                    <Modal
                      transparent={true}
                      animationType="slide"
                      visible={showEndDatePicker}
                      onRequestClose={() => setShowEndDatePicker(false)}
                    >
                      <View style={styles.pickerModalContainer}>
                        <View style={styles.pickerModalContent}>
                          <View style={styles.pickerModalHeader}>
                            <TouchableOpacity
                              onPress={() => setShowEndDatePicker(false)}
                            >
                              <Text style={styles.pickerModalButton}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.pickerModalTitle}>Select End Date</Text>
                            <TouchableOpacity
                              onPress={() => {
                                handleEndDateChange(null, endDate);
                                setShowEndDatePicker(false);
                              }}
                            >
                              <Text style={[styles.pickerModalButton, styles.pickerModalButtonPrimary]}>Done</Text>
                            </TouchableOpacity>
                          </View>
                          <DateTimePicker
                            value={endDate}
                            mode="date"
                            display="spinner"
                            onChange={(event, date) => {
                              if (date) setEndDate(date);
                            }}
                          />
                        </View>
                      </View>
                    </Modal>
                  )}
                  {Platform.OS === 'android' && (
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      display="default"
                      onChange={handleEndDateChange}
                      minimumDate={startDate || new Date()}
                    />
                  )}
                </>
              )}
            </View>

            <View style={[styles.formGroup, styles.formGroupHalf]}>
              <Text style={styles.label}>End Time</Text>
              <TouchableOpacity
                style={[
                  styles.dateTimeInput,
                  formErrors.end_time && styles.inputError,
                ]}
                onPress={() => !submitting && setShowEndTimePicker(true)}
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.dateTimeText,
                    !formData.end_time && styles.placeholderText,
                  ]}
                >
                  {formData.end_time || 'Select end time'}
                </Text>
              </TouchableOpacity>
              {showEndTimePicker && (
                <>
                  {Platform.OS === 'ios' && (
                    <Modal
                      transparent={true}
                      animationType="slide"
                      visible={showEndTimePicker}
                      onRequestClose={() => setShowEndTimePicker(false)}
                    >
                      <View style={styles.pickerModalContainer}>
                        <View style={styles.pickerModalContent}>
                          <View style={styles.pickerModalHeader}>
                            <TouchableOpacity
                              onPress={() => setShowEndTimePicker(false)}
                            >
                              <Text style={styles.pickerModalButton}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.pickerModalTitle}>Select End Time</Text>
                            <TouchableOpacity
                              onPress={() => {
                                handleEndTimeChange(null, endTime);
                                setShowEndTimePicker(false);
                              }}
                            >
                              <Text style={[styles.pickerModalButton, styles.pickerModalButtonPrimary]}>Done</Text>
                            </TouchableOpacity>
                          </View>
                          <DateTimePicker
                            value={endTime}
                            mode="time"
                            display="spinner"
                            onChange={(event, time) => {
                              if (time) setEndTime(time);
                            }}
                            is24Hour={false}
                          />
                        </View>
                      </View>
                    </Modal>
                  )}
                  {Platform.OS === 'android' && (
                    <DateTimePicker
                      value={endTime}
                      mode="time"
                      display="default"
                      onChange={handleEndTimeChange}
                      is24Hour={false}
                    />
                  )}
                </>
              )}
            </View>
          </View>
        </View>

        {/* Assign Users Section - Admin Only */}
        {isAdminUser && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <UsersIcon size={20} color="#2563eb" />
              <Text style={styles.sectionTitle}>Assign Users (Optional)</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Users to Assign</Text>
              <TouchableOpacity
                style={styles.userDropdownTrigger}
                onPress={() => setIsUserDropdownOpen(true)}
              >
                <Text style={styles.userDropdownText}>
                  {selectedUsers.length > 0
                    ? `${selectedUsers.length} user(s) selected`
                    : 'Click to select users...'}
                </Text>
                <Text style={styles.dropdownArrow}>
                  {isUserDropdownOpen ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {selectedUsers.length > 0 && (
                <View style={styles.selectedUsersContainer}>
                  {selectedUsers.map((userId) => {
                    const userObj = allUsers.find(
                      (u) => String(u.id) === userId
                    ) || participantUsersMap[userId];
                    if (!userObj) return null;
                    return (
                      <View key={userId} style={styles.userChip}>
                        <Text style={styles.userChipText}>
                          {userObj.name}
                        </Text>
                        <TouchableOpacity
                          onPress={() => toggleUserSelection(userId)}
                          style={styles.userChipRemove}
                        >
                          <Text style={styles.userChipRemoveText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <Modal
              visible={isUserDropdownOpen}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setIsUserDropdownOpen(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setIsUserDropdownOpen(false)}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Users</Text>
                    <TouchableOpacity
                      onPress={() => setIsUserDropdownOpen(false)}
                    >
                      <Text style={styles.modalClose}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={styles.userSearchInput}
                    placeholder="Search users..."
                    value={userSearchQuery}
                    onChangeText={setUserSearchQuery}
                    autoFocus
                  />

                  <ScrollView style={styles.userList}>
                    {filteredUsers.map((u) => {
                      const isSelected = selectedUsers.includes(
                        String(u.id)
                      );
                      return (
                        <TouchableOpacity
                          key={u.id}
                          style={[
                            styles.userItem,
                            isSelected && styles.userItemSelected,
                          ]}
                          onPress={() => toggleUserSelection(u.id)}
                        >
                          <View style={styles.userItemContent}>
                            <Text style={styles.userItemName}>
                              {u.name}
                            </Text>
                            <Text style={styles.userItemEmail}>
                              {u.email}
                            </Text>
                            {u.user_type === 'admin' && (
                              <View style={styles.userBadge}>
                                <Text style={styles.userBadgeText}>
                                  Admin
                                </Text>
                              </View>
                            )}
                          </View>
                          {isSelected && (
                            <CheckIcon size={20} color="#2563eb" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <Text style={styles.emptyText}>No users found</Text>
                    )}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
        )}

        {/* Additional Details Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <InfoIcon size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Additional Details</Text>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, styles.formGroupHalf]}>
              <Text style={styles.label}>Max Participants</Text>
              <TextInput
                style={[
                  styles.input,
                  formErrors.max_participants && styles.inputError,
                ]}
                value={formData.max_participants}
                onChangeText={(value) =>
                  handleInputChange('max_participants', value)
                }
                placeholder="Leave empty for unlimited"
                keyboardType="numeric"
                editable={!submitting}
              />
              <Text style={styles.hint}>
                Leave empty if there's no limit
              </Text>
            </View>

            <View style={[styles.formGroup, styles.formGroupHalf]}>
              <Text style={styles.label}>Requirements</Text>
              <TextInput
                style={[
                  styles.input,
                  formErrors.requirements && styles.inputError,
                ]}
                value={formData.requirements}
                onChangeText={(value) =>
                  handleInputChange('requirements', value)
                }
                placeholder="e.g., Age 18+, Bring gloves"
                editable={!submitting}
              />
              <Text style={styles.hint}>
                Any special requirements or items needed
              </Text>
            </View>
          </View>
        </View>

        {/* Info Banner */}
        {isAdminUser && (
          <View style={styles.infoBanner}>
            <InfoIcon size={20} color="#2563eb" />
            <View style={styles.infoBannerContent}>
              <Text style={styles.infoBannerTitle}>Public Activity</Text>
              <Text style={styles.infoBannerText}>
                As an admin, this activity will be visible to all volunteers
                and they can join it.
              </Text>
            </View>
          </View>
        )}

        {user && !isAdminUser && (
            <View style={[styles.infoBanner, styles.infoBannerVolunteer]}>
              <InfoIcon size={20} color="#f59e0b" />
              <View style={styles.infoBannerContent}>
                <Text style={styles.infoBannerTitle}>Private Activity</Text>
                <Text style={styles.infoBannerText}>
                  As a volunteer, this activity will only be visible to you and
                  cannot be joined by others.
                </Text>
              </View>
            </View>
          )}

        {/* Form Actions */}
        <View style={styles.formActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={submitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.submitButtonText}>Updating...</Text>
              </> 
            ) : (
              <>
                <PlusIcon size={20} color="#ffffff" />
                <Text style={styles.submitButtonText}>Update Activity</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: '#1e3a8a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  backButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonTextHeader: {
    color: '#1e3a8a',
    fontSize: 14,
    fontWeight: '600',
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  alertTextSuccess: {
    color: '#065f46',
    fontSize: 14,
    flex: 1,
  },
  alertTextError: {
    color: '#991b1b',
    fontSize: 14,
    flex: 1,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  formGroup: {
    marginBottom: 20,
  },
  formGroupHalf: {
    flex: 1,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  dateTimeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#ffffff',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    minHeight: 100,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  userDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#ffffff',
  },
  userDropdownText: {
    fontSize: 16,
    color: '#6b7280',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6b7280',
  },
  selectedUsersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  userChipText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  userChipRemove: {
    marginLeft: 4,
  },
  userChipRemoveText: {
    fontSize: 18,
    color: '#2563eb',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalClose: {
    fontSize: 24,
    color: '#6b7280',
  },
  userSearchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  userList: {
    maxHeight: 400,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  userItemSelected: {
    backgroundColor: '#eff6ff',
  },
  userItemContent: {
    flex: 1,
  },
  userItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  userItemEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  userBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  userBadgeText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    padding: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  infoBannerVolunteer: {
    backgroundColor: '#fef3c7',
    borderLeftColor: '#f59e0b',
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 14,
    color: '#4b5563',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    gap: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  pickerModalButton: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  pickerModalButtonPrimary: {
    color: '#2563eb',
  },
});

export default EditActivityScreen;

