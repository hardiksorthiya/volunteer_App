import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import Header from '../components/Header';
import api, { getFullImageUrl } from '../config/api';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUserData(true);
  }, []);

  // Refresh data when screen comes into focus (e.g., when navigating back from EditProfile)
  useFocusEffect(
    React.useCallback(() => {
      fetchUserData(false);
    }, [])
  );

  const fetchUserData = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setImageError(false); // Reset image error when fetching new data
      // First try to get from AsyncStorage
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
      
      // Then try to fetch fresh data from API
      try {
        const response = await api.get('/users/me');
        if (response.data.success) {
          setUser(response.data.data);
          await AsyncStorage.setItem('user', JSON.stringify(response.data.data));
        }
      } catch (error) {
        // Handle 403 (Forbidden) and 401 (Unauthorized) errors gracefully
        if (error.response?.status === 403 || error.response?.status === 401) {
          console.log('User data fetch not authorized, using cached data');
        } else {
          console.error('Error fetching user:', error.message || error);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleNotificationPress = () => {
    console.log('Notification pressed');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchUserData(false);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const requestImagePickerPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload images!'
        );
        return false;
      }
    }
    return true;
  };

  const handleImagePicker = async () => {
    const hasPermission = await requestImagePickerPermission();
    if (!hasPermission) return;

    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Required', 'Camera permission is required!');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (!result.canceled && result.assets && result.assets[0]) {
                console.log('Image selected from camera:', result.assets[0].uri);
                setSelectedImage(result.assets[0].uri);
                setImageError(false);
                await uploadImage(result.assets[0].uri);
              } else {
                console.log('Image selection from camera canceled');
              }
            } catch (error) {
              console.error('Error picking image from camera:', error);
              Alert.alert('Error', 'Failed to open camera');
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (!result.canceled && result.assets && result.assets[0]) {
                console.log('Image selected from gallery:', result.assets[0].uri);
                setSelectedImage(result.assets[0].uri);
                setImageError(false);
                await uploadImage(result.assets[0].uri);
              } else {
                console.log('Image selection from gallery canceled');
              }
            } catch (error) {
              console.error('Error picking image from gallery:', error);
              Alert.alert('Error', 'Failed to open gallery');
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const uploadImage = async (imageUri) => {
    try {
      setUploadingImage(true);
      console.log('Starting image upload for URI:', imageUri);

      const filename = imageUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      let fileType = 'image/jpeg';
      if (match) {
        const ext = match[1].toLowerCase();
        if (ext === 'png') fileType = 'image/png';
        else if (ext === 'gif') fileType = 'image/gif';
        else if (ext === 'webp') fileType = 'image/webp';
      }

      const fileUri = imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`;
      console.log('File details:', { filename, fileType, fileUri });

      const uploadFormData = new FormData();
      uploadFormData.append('image', {
        uri: fileUri,
        name: filename,
        type: fileType,
      });

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const API_BASE_URL = api.defaults.baseURL;
      console.log('Uploading to:', `${API_BASE_URL}/users/me/upload-image`);

      // Use fetch - React Native handles FormData + file URI reliably with fetch (axios often gives Network Error)
      const response = await fetch(`${API_BASE_URL}/users/me/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: uploadFormData,
      });

      const data = await response.json().catch(() => ({}));
      console.log('Upload response:', data);

      if (!response.ok) {
        const msg = data.message || (response.status === 413 ? 'Image too large' : 'Upload failed');
        throw new Error(msg);
      }
      if (data && data.success) {
        const imageUrl = data.data?.image || data.data?.profile_image || data.data?.image_url || data.image;
        console.log('Image uploaded successfully, URL:', imageUrl);
        const updatedUser = { ...user, image: imageUrl, profile_image: imageUrl };
        setUser(updatedUser);
        setSelectedImage(null);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        Alert.alert('Success', 'Profile image updated successfully!');
      } else {
        throw new Error(data.message || 'Failed to upload image');
      }
    } catch (error) {
      console.log('Image upload failed:', error?.message || error);
      let errorMessage = 'Failed to upload image. Please try again.';
      if (error.message) errorMessage = error.message;
      Alert.alert('Error', errorMessage);
      setSelectedImage(null);
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header onNotificationPress={handleNotificationPress} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading profile...</Text>
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
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handleImagePicker}
            disabled={uploadingImage}
            activeOpacity={0.7}
          >
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={styles.avatarImage}
              />
            ) : (user?.image || user?.profile_image) && !imageError ? (
              <Image
                source={{ uri: getFullImageUrl(user.image || user.profile_image) }}
                style={styles.avatarImage}
                onError={() => {
                  // If image fails to load, show placeholder
                  setImageError(true);
                }}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {getInitials(user?.name)}
                </Text>
              </View>
            )}
            {uploadingImage && (
              <View style={styles.imageUploadingOverlay}>
                <ActivityIndicator size="small" color="#ffffff" />
              </View>
            )}
            <View style={styles.editImageButton}>
              <Text style={styles.editImageButtonText}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          {user?.user_type && (
            <View style={styles.userTypeBadge}>
              <Text style={styles.userTypeText}>
                {user.user_type === 'admin' || user.role === 0 ? 'Admin' : 'Volunteer'}
              </Text>
            </View>
          )}
        </View>

        {/* Profile Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          {/* Name */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>👤</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{user?.name || 'Not provided'}</Text>
              </View>
            </View>
          </View>

          {/* Email */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>📧</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email || 'Not provided'}</Text>
              </View>
            </View>
          </View>

          {/* Phone */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>📱</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{user?.phone || user?.mobile || 'Not provided'}</Text>
              </View>
            </View>
          </View>

        </View>

        {/* Additional Information */}
        {(user?.organization_name || user?.bio) && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            
            {user?.organization_name && (
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Text style={styles.infoIcon}>🏢</Text>
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Organization</Text>
                    <Text style={styles.infoValue}>{user.organization_name}</Text>
                  </View>
                </View>
              </View>
            )}

            {user?.bio && (
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Text style={styles.infoIcon}>📝</Text>
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Bio</Text>
                    <Text style={styles.infoValue}>{user.bio}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Edit Profile Button */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  userTypeBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoIcon: {
    fontSize: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    lineHeight: 22,
  },
  editButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  editImageButtonText: {
    fontSize: 20,
  },
  imageUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfileScreen;

