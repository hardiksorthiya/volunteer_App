import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../config/api';
import { UserIcon, MailIcon, PhoneIcon, LockIcon } from '../components/Icons';

const RegisterScreen = () => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
    setError('');
  };

  const handleSubmit = async () => {
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        mobile: formData.phone,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      if (response.data.success) {
        // Navigate to Login screen after successful registration
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    } catch (err) {
      // Only log unexpected errors
      if (err.response?.status !== 400 && err.response?.status !== 409) {
        console.error('Registration error:', err);
      }
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (err.code === 'ECONNREFUSED' || err.code === 'NETWORK_ERROR' || err.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      } else if (err.response?.data?.message) {
        // Use the server's error message
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 400) {
        errorMessage = 'Please check your information and try again.';
      } else if (err.response?.status === 409) {
        errorMessage = 'An account with this email already exists.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Clear form and errors on refresh
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    });
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    // Simulate refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
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
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.welcomeContent}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.companyLogo}
            resizeMode="contain"
            accessibilityLabel="Volunteer Connect"
          />
          <Text style={styles.welcomeTitle}>Join Us</Text>
          <Text style={styles.welcomeHeadline}>Volunteer Connect</Text>
        </View>
      </View>

      {/* Form Section */}
      <View style={styles.formSection}>
        <Text style={styles.formTitle}>Sign up</Text>
        <Text style={styles.formSubtitle}>Create your account to get started</Text>

        {/* Name Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconContainer}>
              <UserIcon size={20} color="#6b7280" />
            </View>
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              placeholder="Enter your full name"
              placeholderTextColor="#9ca3af"
              value={formData.name}
              onChangeText={(value) => handleChange('name', value)}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Email Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconContainer}>
              <MailIcon size={20} color="#6b7280" />
            </View>
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              placeholder="Enter your email"
              placeholderTextColor="#9ca3af"
              value={formData.email}
              onChangeText={(value) => handleChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Phone Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconContainer}>
              <PhoneIcon size={20} color="#6b7280" />
            </View>
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              placeholder="Enter your phone number"
              placeholderTextColor="#9ca3af"
              value={formData.phone}
              onChangeText={(value) => handleChange('phone', value)}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Password Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconContainer}>
              <LockIcon size={20} color="#6b7280" />
            </View>
            <TextInput
              style={[styles.input, styles.inputWithIcon, styles.passwordInput]}
              placeholder="Enter your password"
              placeholderTextColor="#9ca3af"
              value={formData.password}
              onChangeText={(value) => handleChange('password', value)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.passwordToggleText}>
                {showPassword ? 'HIDE' : 'SHOW'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm Password Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconContainer}>
              <LockIcon size={20} color="#6b7280" />
            </View>
            <TextInput
              style={[styles.input, styles.inputWithIcon, styles.passwordInput]}
              placeholder="Confirm your password"
              placeholderTextColor="#9ca3af"
              value={formData.confirmPassword}
              onChangeText={(value) => handleChange('confirmPassword', value)}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Text style={styles.passwordToggleText}>
                {showConfirmPassword ? 'HIDE' : 'SHOW'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Sign Up Button */}
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Sign up</Text>
          )}
        </TouchableOpacity>

        {/* Sign In Link */}
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e3a8a',
  },
  contentContainer: {
    flexGrow: 1,
  },
  welcomeSection: {
    backgroundColor: '#2563eb',
    padding: 30,
    paddingTop: 60,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 250,
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: 50,
    right: -50,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: 30,
    left: -30,
  },
  welcomeContent: {
    position: 'relative',
    zIndex: 2,
    alignItems: 'center',
  },
  companyLogo: {
    width: 220,
    height: 56,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  welcomeHeadline: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.95,
  },
  welcomeDescription: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 22,
    opacity: 0.9,
  },
  formSection: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    flex: 1,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIconContainer: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  input: {
    width: '100%',
    padding: 14,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  inputWithIcon: {
    paddingLeft: 48,
  },
  passwordInput: {
    paddingRight: 70,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  passwordToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    letterSpacing: 0.5,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  primaryButton: {
    width: '100%',
    padding: 14,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#6b7280',
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
});

export default RegisterScreen;

