import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import GuestAIChatPanel from '../components/GuestAIChatPanel';

const LandingScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <View style={styles.hero}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Volunteer Connect logo"
            />
            <Text style={styles.title}>Volunteer Connect</Text>
            <Text style={styles.tagline}>Connect. Volunteer. Make a Difference.</Text>
            <Text style={styles.description}>
              Join volunteers and organizations making an impact. Discover opportunities, track your hours,
              and get help from our AI assistant — scroll down to try it before you sign in.
            </Text>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.btnLogin}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
              >
                <Text style={styles.btnLoginText}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSignup}
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.85}
              >
                <Text style={styles.btnSignupText}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.aiSection}>
            <Text style={styles.aiSectionTitle}>Try the AI assistant</Text>
            <Text style={styles.aiSectionHint}>
              You can ask up to 3 questions without logging in. After that, sign in to keep chatting.
            </Text>
            <GuestAIChatPanel
              variant="embedded"
              onPressLogin={() => navigation.navigate('Login')}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1e3a8a',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    flexGrow: 1,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  logo: {
    width: 200,
    height: 56,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginBottom: 14,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    maxWidth: 360,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
    width: '100%',
  },
  btnLogin: {
    minWidth: 130,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'transparent',
  },
  btnLoginText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  btnSignup: {
    minWidth: 130,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  btnSignupText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  aiSection: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  aiSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    textAlign: 'center',
  },
  aiSectionHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 19,
    paddingHorizontal: 8,
  },
});

export default LandingScreen;
