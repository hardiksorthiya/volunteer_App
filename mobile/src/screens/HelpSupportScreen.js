import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';

const HelpSupportScreen = () => {
  const navigation = useNavigation();
  const handleNotificationPress = () => {
    console.log('Notification pressed');
  };

  const openEmail = () => {
    Linking.openURL('mailto:support@volunteerconnectors.com?subject=Support Request');
  };

  return (
    <View style={styles.container}>
      <Header onNotificationPress={handleNotificationPress} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Help & Support</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Welcome to Volunteer Connectors</Text>
          <Text style={styles.text}>
            Volunteer Connectors is a platform designed to connect volunteers with meaningful activities and organizations in their community. Whether you're looking to give back, find opportunities, or manage volunteer programs, we're here to help.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Getting Started</Text>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listText}>
              <Text style={styles.bold}>Create an Account:</Text> Register with your email to start connecting with volunteer opportunities.
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listText}>
              <Text style={styles.bold}>Browse Activities:</Text> Explore available volunteer activities organized by category and location.
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listText}>
              <Text style={styles.bold}>Join Activities:</Text> Sign up for activities that interest you and start making a difference.
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listText}>
              <Text style={styles.bold}>Track Your Impact:</Text> Monitor your volunteer hours and contributions through your dashboard.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Common Questions</Text>
          
          <Text style={styles.question}>How do I join a volunteer activity?</Text>
          <Text style={styles.answer}>
            Browse the Activities tab, select an activity you're interested in, and tap "Join Activity". You'll receive notifications about the activity details and updates.
          </Text>

          <Text style={styles.question}>Can I create my own volunteer activities?</Text>
          <Text style={styles.answer}>
            Yes! If you're an organization or admin user, you can create new volunteer activities from the Activities screen. Tap the "+" button to add a new activity.
          </Text>

          <Text style={styles.question}>How do I track my volunteer hours?</Text>
          <Text style={styles.answer}>
            Your volunteer hours are automatically tracked when you complete tasks assigned to activities. View your statistics and progress on the Dashboard screen.
          </Text>

          <Text style={styles.question}>What is the AI Chat feature?</Text>
          <Text style={styles.answer}>
            The AI Chat assistant helps you find volunteer opportunities, answer questions about the app, and provides personalized recommendations based on your interests.
          </Text>

          <Text style={styles.question}>How do I change my profile information?</Text>
          <Text style={styles.answer}>
            Go to Settings → Profile or Edit Profile to update your personal information, including name, email, phone, and profile picture.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>📱 Activity Management</Text>
            <Text style={styles.featureText}>
              Discover and join volunteer activities. Organize tasks, track progress, and collaborate with other volunteers.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>💬 AI Chat Assistant</Text>
            <Text style={styles.featureText}>
              Get instant help and recommendations from our AI-powered chat assistant available 24/7.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>📊 Dashboard Analytics</Text>
            <Text style={styles.featureText}>
              View comprehensive statistics about your volunteer contributions, including hours logged, activities completed, and impact metrics.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>👥 Community Connection</Text>
            <Text style={styles.featureText}>
              Connect with organizations and other volunteers. Build a network of like-minded individuals making a difference.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Need More Help?</Text>
          <Text style={styles.text}>
            If you have additional questions or need technical support, please contact us:
          </Text>
          
          <TouchableOpacity style={styles.contactButton} onPress={openEmail}>
            <Text style={styles.contactButtonText}>📧 Email Support</Text>
          </TouchableOpacity>

          <Text style={styles.contactInfo}>
            Email: support@volunteerconnectors.com{'\n'}
            We typically respond within 24-48 hours.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>App Version:</Text> 1.0.0{'\n'}
            <Text style={styles.bold}>Platform:</Text> Volunteer Connectors Mobile App{'\n'}
            <Text style={styles.bold}>Last Updated:</Text> {new Date().getFullYear()}
          </Text>
        </View>
      </ScrollView>
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 4,
  },
  bullet: {
    fontSize: 20,
    color: '#2563eb',
    marginRight: 12,
    fontWeight: 'bold',
  },
  listText: {
    flex: 1,
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
  bold: {
    fontWeight: '700',
    color: '#1f2937',
  },
  question: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  answer: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 12,
    paddingLeft: 4,
  },
  featureCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  contactButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  contactButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactInfo: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
  },
});

export default HelpSupportScreen;
