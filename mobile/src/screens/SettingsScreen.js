import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/Header';
import api from '../config/api';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleNotificationPress = () => {
    console.log('Notification pressed');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh settings data if needed
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      Alert.alert('Password required', 'Enter your password to delete your account.');
      return;
    }
    setDeleteLoading(true);
    try {
      const response = await api.post('/auth/delete-account', { password: deletePassword });
      if (response.data?.success) {
        setDeleteModalVisible(false);
        setDeletePassword('');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('rememberMe');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Landing' }],
        });
      } else {
        Alert.alert('Error', response.data?.message || 'Could not delete account.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not delete account. Check your password and try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user');
              await AsyncStorage.removeItem('rememberMe');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Landing' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header onNotificationPress={handleNotificationPress} />
      <ScrollView
        contentContainerStyle={styles.content}
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
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.settingLabel}>Profile</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              try {
                console.log('Change Password pressed, navigating to ChangePassword...');
                navigation.navigate('ChangePassword');
              } catch (error) {
                console.error('Navigation error:', error);
                Alert.alert('Error', 'Failed to open Change Password screen. Please try again.');
              }
            }}
          >
            <Text style={styles.settingLabel}>Change Password</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, styles.dangerItem]}
            onPress={() => {
              setDeletePassword('');
              setDeleteModalVisible(true);
            }}
          >
            <Text style={styles.dangerLabel}>Delete account</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>


        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              try {
                console.log('Navigating to HelpSupport...');
                navigation.navigate('HelpSupport');
              } catch (error) {
                console.error('Navigation error:', error);
                Alert.alert('Error', 'Failed to open Help & Support. Please try again.');
              }
            }}
          >
            <Text style={styles.settingLabel}>Help & Support</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              try {
                console.log('Navigating to TermsConditions...');
                navigation.navigate('TermsConditions');
              } catch (error) {
                console.error('Navigation error:', error);
                Alert.alert('Error', 'Failed to open Terms & Conditions. Please try again.');
              }
            }}
          >
            <Text style={styles.settingLabel}>Terms & Conditions</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              try {
                console.log('Navigating to PrivacyPolicy...');
                navigation.navigate('PrivacyPolicy');
              } catch (error) {
                console.error('Navigation error:', error);
                Alert.alert('Error', 'Failed to open Privacy Policy. Please try again.');
              }
            }}
          >
            <Text style={styles.settingLabel}>Privacy Policy</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>App Version</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !deleteLoading && setDeleteModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete account</Text>
            <Text style={styles.modalBody}>
              This permanently removes your Volunteer Connect account and related data. Enter your password to confirm.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Current password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
              editable={!deleteLoading}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  if (!deleteLoading) {
                    setDeleteModalVisible(false);
                    setDeletePassword('');
                  }
                }}
                disabled={deleteLoading}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnDanger]}
                onPress={handleDeleteAccount}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalBtnDangerText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 24,
  },
  section: {
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dangerItem: {
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  dangerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#b91c1c',
  },
  settingLabel: {
    fontSize: 16,
    color: '#1f2937',
  },
  settingArrow: {
    fontSize: 24,
    color: '#9ca3af',
  },
  settingValue: {
    fontSize: 16,
    color: '#6b7280',
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 14,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
    color: '#1f2937',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalBtnCancelText: {
    fontWeight: '600',
    color: '#374151',
  },
  modalBtnDanger: {
    backgroundColor: '#dc2626',
  },
  modalBtnDangerText: {
    fontWeight: '600',
    color: '#ffffff',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;

