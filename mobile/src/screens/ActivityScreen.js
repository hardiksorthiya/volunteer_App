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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import { SearchIcon, FilterIcon, PlusIcon, EyeIcon, EditIcon, TrashIcon, CheckIcon } from '../components/Icons';
import api from '../config/api';

const ActivityScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activities, setActivities] = useState([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeTab, setActiveTab] = useState('my'); // 'my' or 'other'
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }
        await fetchUser();
        await fetchActivities();
      } catch (error) {
        console.error('Error in useEffect:', error);
        setLoading(false);
      }
    };
    checkAuthAndFetch();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          if (token) {
            await fetchActivities();
          }
        } catch (error) {
          console.error('Error refreshing data:', error);
        }
      };
      refreshData();
    }, [])
  );

  const fetchUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
      // Optionally fetch fresh user data from API
      try {
        const response = await api.get('/users/me');
        if (response.data.success) {
          setUser(response.data.data);
          await AsyncStorage.setItem('user', JSON.stringify(response.data.data));
        }
      } catch (error) {
        // Handle 403 (Forbidden) and 401 (Unauthorized) errors gracefully
        if (error.response?.status === 403 || error.response?.status === 401) {
          // User doesn't have permission or is not authenticated
          // Keep using cached user data if available
          console.log('User data fetch not authorized, using cached data');
        } else {
          const errorMessage = error?.message || error?.toString() || 'Unknown error';
          console.error('Error fetching user:', errorMessage);
        }
      }
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      console.error('Error loading user data:', errorMessage);
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
            creator_user_type: activity.creator_user_type,
            start_date: activity.start_date,
            end_date: activity.end_date
          };
        });
        setActivities(mappedActivities);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      Alert.alert('Error', 'Failed to load activities. Please try again.');
    } finally {
      setLoading(false);
    }
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
        return status || 'Upcoming';
    }
  };

  const handleDeleteActivity = (activityId, activityTitle) => {
    Alert.alert(
      'Delete Activity',
      `Are you sure you want to delete "${activityTitle}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/activities/${activityId}`);
              if (response.data.success) {
                await fetchActivities();
                Alert.alert('Success', 'Activity deleted successfully.');
              } else {
                Alert.alert('Error', 'Failed to delete activity. Please try again.');
              }
            } catch (error) {
              console.error('Error deleting activity:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete activity. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleJoinActivity = async (activityId) => {
    try {
      const response = await api.post(`/activities/${activityId}/join`);
      if (response.data.success) {
        await fetchActivities();
        // Switch to "My Activity" tab to show the joined activity
        setActiveTab('my');
        Alert.alert('Success', 'Successfully joined the activity!');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to join activity. Please try again.');
      }
    } catch (error) {
      console.error('Error joining activity:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to join activity. Please try again.');
    }
  };

  const handleLeaveActivity = (activityId) => {
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
                await fetchActivities();
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

  // Filter activities based on active tab
  const getTabActivities = () => {
    if (!Array.isArray(activities)) return [];
    
    if (activeTab === 'my') {
      // My Activity: activities created by user or activities user has joined
      return activities.filter(activity => {
        if (!activity || typeof activity !== 'object') return false;
        const isCreatedByUser = user && user.id && activity.created_by === user.id;
        // Handle both boolean true and numeric 1 from MySQL
        const isJoined = activity.is_joined === true || activity.is_joined === 1 || activity.is_joined === '1';
        return isCreatedByUser || isJoined;
      });
    } else {
      // Other Activity: public activities that user can join
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

        // User hasn't joined (handle both boolean true and numeric 1 from MySQL)
        if (activity.is_joined === true || activity.is_joined === 1 || activity.is_joined === '1') return false;

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

  const handleNotificationPress = () => {
    console.log('Notification pressed');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Pull to refresh - fetching activities');
      await Promise.all([
        fetchUser(),
        fetchActivities(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderActivityCard = ({ item: activity }) => {
    if (!activity || typeof activity !== 'object') {
      return null;
    }
    
    // Ensure all required properties exist
    const safeActivity = {
      id: activity.id,
      title: activity.title || 'N/A',
      description: activity.description || '',
      location: activity.location || '',
      category: activity.category || '',
      organization: activity.organization || '',
      volunteers: activity.volunteers != null ? activity.volunteers : 0,
      maxVolunteers: activity.maxVolunteers != null ? activity.maxVolunteers : null,
      status: activity.status || 'upcoming',
      is_public: activity.is_public || false,
      is_joined: activity.is_joined || false,
      created_by: activity.created_by,
      creator_user_type: activity.creator_user_type || null,
      start_date: activity.start_date || activity.date || null,
      end_date: activity.end_date || null,
    };
    
    const statusColor = getStatusColor(safeActivity.status);
    const isAdmin = user && (user.role === 0 || user.user_type === 'admin');
    const isCreator = user && user.id && safeActivity.created_by === user.id;
    // Hide volunteer count for activities created by volunteer/user (no "volunteer connect" for those)
    const showVolunteerCount = !(safeActivity.creator_user_type === 'volunteer' || isCreator);

    return (
      <View style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <View style={styles.activityTitleRow}>
            <View style={[styles.activityAvatar, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.activityAvatarText, { color: statusColor }]}>
                {safeActivity.title && safeActivity.title.length > 0 
                  ? safeActivity.title.charAt(0).toUpperCase() 
                  : 'A'}
              </Text>
            </View>
            <View style={styles.activityTitleContainer}>
              <Text style={styles.activityTitle}>{safeActivity.title}</Text>
              <View style={styles.activityMeta}>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                    {getStatusLabel(safeActivity.status)}
                  </Text>
                </View>
                {safeActivity.category ? (
                  <Text style={styles.categoryText}>{safeActivity.category}</Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {safeActivity.description ? (
          <Text style={styles.activityDescription} numberOfLines={2}>
            {safeActivity.description}
          </Text>
        ) : null}

        <View style={styles.activityInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📅 Date:</Text>
            <Text style={styles.infoValue}>
              {safeActivity.start_date 
                ? new Date(safeActivity.start_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'N/A'}
            </Text>
          </View>
          {safeActivity.location ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>📍 Location:</Text>
              <Text style={styles.infoValue}>{safeActivity.location}</Text>
            </View>
          ) : null}
          {showVolunteerCount ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>👥 Volunteers:</Text>
              <Text style={styles.infoValue}>
                {String(safeActivity.volunteers)}
                {safeActivity.maxVolunteers != null ? ` / ${String(safeActivity.maxVolunteers)}` : ''}
              </Text>
            </View>
          ) : null}
          {safeActivity.organization ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>🏢 Organization:</Text>
              <Text style={styles.infoValue}>{safeActivity.organization}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.activityActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => {
              navigation.navigate('ActivityDetail', { activityId: safeActivity.id });
            }}
          >
            <EyeIcon size={18} color="#2563eb" />
            <Text style={[styles.actionButtonText, { color: '#2563eb', marginLeft: 6 }]}>View</Text>
          </TouchableOpacity>

          {/* Join/Leave button for regular users on public activities */}
          {user && !(user.role === 0 || user.user_type === 'admin') && safeActivity.is_public && (
            <>
              {!(safeActivity.is_joined === true || safeActivity.is_joined === 1 || safeActivity.is_joined === '1') ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.joinButton]}
                  onPress={() => handleJoinActivity(safeActivity.id)}
                >
                  <PlusIcon size={22} color="#ffffff" />
                  <Text style={[styles.actionButtonText, { color: '#ffffff', marginLeft: 6 }]}>Join</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.leaveButton]}
                  onPress={() => handleLeaveActivity(safeActivity.id)}
                >
                  <CheckIcon size={22} color="#ffffff" />
                  <Text style={[styles.actionButtonText, { color: '#ffffff', marginLeft: 6 }]}>Joined</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Show edit/delete buttons only for admins or activity creators (not for users who only joined) */}
          {(user && (user.role === 0 || user.user_type === 'admin' || isCreator)) ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => {
                  // Navigate to edit screen
                  console.log('Navigating to EditActivity with activityId:', safeActivity.id);
                  navigation.navigate('EditActivity', { activityId: safeActivity.id });
                }}
              >
                <EditIcon size={18} color="#2563eb" />
                <Text style={[styles.actionButtonText, { color: '#2563eb', marginLeft: 6 }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteActivity(safeActivity.id, safeActivity.title)}
              >
                <TrashIcon size={18} color="#ef4444" />
                <Text style={[styles.actionButtonText, { color: '#ef4444', marginLeft: 6 }]}>Delete</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>
    );
  };

  if (loading && activities.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Header onNotificationPress={handleNotificationPress} />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading activities...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header onNotificationPress={handleNotificationPress} />
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563eb']}
            tintColor="#2563eb"
            title="Pull to refresh"
            titleColor="#6b7280"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Activities</Text>
            <Text style={styles.subtitle} numberOfLines={1}>View and manage all your volunteer activities</Text>
          </View>
          {activeTab === 'my' && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                navigation.navigate('AddActivity');
              }}
            >
              <PlusIcon size={18} color="#ffffff" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'my' && styles.tabActive]}
            onPress={() => setActiveTab('my')}
          >
            <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
              My Activity
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'other' && styles.tabActive]}
            onPress={() => setActiveTab('other')}
          >
            <Text style={[styles.tabText, activeTab === 'other' && styles.tabTextActive]}>
              Other Activity
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search and Filter Bar */}
        <View style={styles.controls}>
          <View style={styles.searchBox}>
            <SearchIcon size={20} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search activities..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <FilterIcon size={20} color="#6b7280" />
            <Text style={styles.filterButtonText}>
              {filterStatus === 'all' ? 'All' : 
               filterStatus === 'upcoming' ? 'Upcoming' :
               filterStatus === 'ongoing' ? 'Ongoing' : 'Completed'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Activities List */}
        {filteredActivities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No activities found</Text>
            <Text style={styles.emptyText}>Try adjusting your search or filter criteria</Text>
          </View>
        ) : (
          <FlatList
            data={filteredActivities}
            renderItem={renderActivityCard}
            keyExtractor={(item) => item && item.id ? String(item.id) : String(Math.random())}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter Activities</Text>
            <TouchableOpacity
              style={[styles.filterOption, filterStatus === 'all' && styles.filterOptionActive]}
              onPress={() => {
                setFilterStatus('all');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, filterStatus === 'all' && styles.filterOptionTextActive]}>
                All Activities
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterOption, filterStatus === 'upcoming' && styles.filterOptionActive]}
              onPress={() => {
                setFilterStatus('upcoming');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, filterStatus === 'upcoming' && styles.filterOptionTextActive]}>
                Upcoming
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterOption, filterStatus === 'ongoing' && styles.filterOptionActive]}
              onPress={() => {
                setFilterStatus('ongoing');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, filterStatus === 'ongoing' && styles.filterOptionTextActive]}>
                Ongoing
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterOption, filterStatus === 'completed' && styles.filterOptionActive]}
              onPress={() => {
                setFilterStatus('completed');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, filterStatus === 'completed' && styles.filterOptionTextActive]}>
                Completed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
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
  content: {
    padding: 16,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
    flexShrink: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    flexShrink: 0,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  listContainer: {
    gap: 16,
  },
  activityCard: {
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
  activityHeader: {
    marginBottom: 12,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  activityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityAvatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  activityTitleContainer: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryText: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activityDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  activityInfo: {
    marginBottom: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  activityActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    minWidth: 70,
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewButton: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  joinButton: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  leaveButton: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  editButton: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
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
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 20,
  },
  filterOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f3f4f6',
  },
  filterOptionActive: {
    backgroundColor: '#eff6ff',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#1f2937',
  },
  filterOptionTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  modalCloseButton: {
    marginTop: 20,
    paddingVertical: 16,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#ffffff',
  },
});

export default ActivityScreen;
