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
import { MailIcon } from '../components/Icons';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleChange = (value) => {
    setEmail(value);
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess(false);

    const trimmedEmail = (email || '').trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', {
        email: trimmedEmail
      });

      if (response.data.success) {
        setSentEmail(trimmedEmail);
        setSuccess(true);
        setEmail('');
      } else {
        setError(response.data?.message || 'Failed to send reset link. Please try again.');
      }
    } catch (err) {
      if (err.response?.status !== 400) {
        console.error('Forgot password error:', err);
      }
      let errorMessage = 'Failed to send reset link. Please try again.';
      if (err.code === 'ECONNREFUSED' || err.code === 'NETWORK_ERROR' || err.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data.message || 'Please enter a valid email address.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAnother = () => {
    setSuccess(false);
    setSentEmail('');
    setEmail('');
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Clear form and errors on refresh
    setEmail('');
    setError('');
    setSuccess(false);
    setSentEmail('');
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
          <Text style={styles.welcomeTitle}>Reset</Text>
          <Text style={styles.welcomeHeadline}>Your Password</Text>
        </View>
      </View>

      {/* Form Section */}
      <View style={styles.formSection}>
        {!success ? (
          <>
            <Text style={styles.formTitle}>Forgot Password</Text>
            <Text style={styles.formSubtitle}>
              Enter your email address and we'll send you a link to reset your password
            </Text>

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
                  value={email}
                  onChangeText={handleChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.successContainer}>
            {/* Success Icon */}
            <View style={styles.successIconWrapper}>
              <Text style={styles.successIcon}>✓</Text>
            </View>

            <Text style={styles.formTitle}>Check Your Email</Text>
            <Text style={styles.formSubtitle}>
              We've sent a password reset link to{'\n'}
              <Text style={styles.emailText}>{sentEmail || 'your email address'}</Text>
            </Text>

            {/* Success Info Box */}
            <View style={styles.successInfoBox}>
              <Text style={styles.successInfoText}>
                Please check your inbox and click on the reset link to create a new password. 
                The link will expire in 1 hour for security reasons.
              </Text>
              <Text style={[styles.successInfoText, { marginTop: 12 }]}>
                Didn't receive the email? Check your spam folder or try again.
              </Text>
            </View>

            {/* Send Another Button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSendAnother}
            >
              <Text style={styles.primaryButtonText}>Send Another Email</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Navigation Links */}
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>Remember your password? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Sign in</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Sign up</Text>
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
    lineHeight: 20,
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
  // Success State Styles
  successContainer: {
    alignItems: 'center',
    width: '100%',
  },
  successIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successIcon: {
    fontSize: 40,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  emailText: {
    fontWeight: '600',
    color: '#1f2937',
  },
  successInfoBox: {
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 16,
    marginVertical: 24,
    width: '100%',
  },
  successInfoText: {
    fontSize: 14,
    color: '#065f46',
    lineHeight: 20,
  },
});

export default ForgotPasswordScreen;

