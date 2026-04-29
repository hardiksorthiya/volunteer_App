import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import Header from '../components/Header';
import api, { getFullImageUrl } from '../config/api';

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setImageError(false);
      // First try to get from AsyncStorage
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setFormData({
          name: parsedUser.name || '',
          email: parsedUser.email || '',
          phone: parsedUser.phone || parsedUser.mobile || '',
        });
      }
      
      // Then try to fetch fresh data from API
      try {
        const response = await api.get('/users/me');
        if (response.data.success) {
          const userData = response.data.data;
          setUser(userData);
          setFormData({
            name: userData.name || '',
            email: userData.email || '',
            phone: userData.phone || userData.mobile || '',
          });
          await AsyncStorage.setItem('user', JSON.stringify(userData));
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
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
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

      // Use fetch instead of axios - React Native handles FormData + file URI reliably with fetch
      const response = await fetch(`${API_BASE_URL}/users/me/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Do NOT set Content-Type - fetch sets multipart/form-data with boundary automatically
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
        return imageUrl;
      }
      throw new Error(data.message || 'Failed to upload image');
    } catch (error) {
      console.log('Image upload failed:', error?.message || error);
      let errorMessage = 'Failed to upload image. Please try again.';
      if (error.message) errorMessage = error.message;
      throw new Error(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Please enter your name');
      return;
    }
    if (!formData.email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email');
      return;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }

    setSaving(true);
    try {
      let imageUrl = null;
      
      // Upload image if selected
      if (selectedImage) {
        try {
          imageUrl = await uploadImage(selectedImage);
        } catch (error) {
          Alert.alert(
            'Image Upload Error',
            error?.message || 'Failed to upload image. Profile will be updated without image change.'
          );
        }
      }

      const updateData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        mobile: formData.phone.trim() || null,
      };

      // Add image URL if uploaded
      if (imageUrl) {
        updateData.image = imageUrl;
        updateData.profile_image = imageUrl;
      }

      const response = await api.put('/users/me', updateData);
      
      if (response.data.success) {
        const updatedUser = response.data.data;
        setUser(updatedUser);
        setSelectedImage(null); // Clear selected image after successful save
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        Alert.alert('Success', 'Profile updated successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update profile. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationPress = () => {
    console.log('Notification pressed');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Header onNotificationPress={handleNotificationPress} />
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
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
                  setImageError(true);
                }}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {getInitials(formData.name || user?.name)}
                </Text>
              </View>
            )}
            {uploadingImage && (
              <View style={styles.imageUploadingOverlay}>
                <ActivityIndicator size="small" color="#ffffff" />
              </View>
            )}
            <TouchableOpacity
              style={[styles.editImageButton, uploadingImage && styles.buttonDisabled]}
              onPress={handleImagePicker}
              disabled={uploadingImage || saving}
            >
              <Text style={styles.editImageButtonText}>📷</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>Edit Profile</Text>
          {user?.user_type && (
            <View style={styles.userTypeBadge}>
              <Text style={styles.userTypeText}>
                {user.user_type === 'admin' || user.role === 0 ? 'Admin' : 'Volunteer'}
              </Text>
            </View>
          )}
        </View>

        {/* Edit Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          {/* Name */}
          <View style={styles.inputCard}>
            <View style={styles.inputRow}>
              <View style={styles.inputIconContainer}>
                <Text style={styles.inputIcon}>👤</Text>
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(value) => handleChange('name', value)}
                  placeholder="Enter your name"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputCard}>
            <View style={styles.inputRow}>
              <View style={styles.inputIconContainer}>
                <Text style={styles.inputIcon}>📧</Text>
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(value) => handleChange('email', value)}
                  placeholder="Enter your email"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputCard}>
            <View style={styles.inputRow}>
              <View style={styles.inputIconContainer}>
                <Text style={styles.inputIcon}>📱</Text>
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(value) => handleChange('phone', value)}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  formSection: {
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
  inputCard: {
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inputIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    flexShrink: 0,
  },
  inputIcon: {
    fontSize: 24,
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    padding: 0,
    minHeight: 24,
  },
  textAreaInput: {
    minHeight: 60,
    paddingTop: 8,
  },
  buttonContainer: {
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default EditProfileScreen;

