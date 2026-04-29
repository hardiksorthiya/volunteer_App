import React, { useEffect, useState, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import ActivityDetailScreen from './src/screens/ActivityDetailScreen';
import AddActivityScreen from './src/screens/AddActivityScreen';
import EditActivityScreen from './src/screens/EditActivityScreen';
import ChatScreen from './src/screens/ChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import HelpSupportScreen from './src/screens/HelpSupportScreen';
import TermsConditionsScreen from './src/screens/TermsConditionsScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import HourTargetsScreen from './src/screens/HourTargetsScreen';
import { HomeIcon, ActivityIcon, ChatIcon, SettingsIcon } from './src/components/Icons';
import { ClockIcon } from './src/components/Icons';
import AIGuestFloatingWidget from './src/components/AIGuestFloatingWidget';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main Tab Navigator (shown after login)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          paddingHorizontal: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
        },
      }}
    >
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: 'AI Chat',
          tabBarIcon: ({ color, size }) => (
            <ChatIcon size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityScreen}
        options={{
          tabBarLabel: 'Activities',
          tabBarIcon: ({ color, size }) => (
            <ActivityIcon size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HourlyTarget"
        component={HourTargetsScreen}
        options={{
          tabBarLabel: 'Hourly Target',
          tabBarIcon: ({ color, size }) => (
            <ClockIcon size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <HomeIcon size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <SettingsIcon size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSplashFinished, setIsSplashFinished] = useState(false);
  const [currentRouteName, setCurrentRouteName] = useState(null);
  const navigationRef = useRef(null);
  const splashScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    // Run splash animation once at app start.
    Animated.sequence([
      Animated.timing(splashScale, {
        toValue: 1.08,
        duration: 1000,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true
      }),
      Animated.timing(splashScale, {
        toValue: 0.98,
        duration: 1000,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true
      })
    ]).start();

    // Ensure the splash shows for ~2 seconds.
    const splashTimer = setTimeout(() => setIsSplashFinished(true), 2000);

    // Check if user is already logged in
    checkAuthStatus();
    
    // Set up interval to check auth status periodically
    const authCheckInterval = setInterval(() => {
      checkAuthStatus();
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(authCheckInterval);
      clearTimeout(splashTimer);
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (token) {
        setIsAuthenticated((prevAuth) => {
          if (!prevAuth) {
            // User just logged in
            return true;
          }
          return true;
        });
      } else {
        setIsAuthenticated((prevAuth) => {
          // If user was authenticated but now token is gone, navigate to login
          if (prevAuth && navigationRef.current?.isReady()) {
            setTimeout(() => {
              navigationRef.current?.reset({
                index: 0,
                routes: [{ name: 'Landing' }],
              });
            }, 100);
          }
          return false;
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !isSplashFinished) {
    // Splash screen (2 seconds) - then continue to login/dashboard.
    return (
      <View style={styles.splashRoot}>
        <StatusBar style="light" />
        <Animated.View style={{ transform: [{ scale: splashScale }] }}>
          {/* Center logo for 2 seconds */}
          <View style={styles.splashLogoWrap}>
            <Image
              source={require('./assets/logo.png')}
              style={styles.splashLogo}
              resizeMode="contain"
            />
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          const initialRoute = navigationRef.current?.getCurrentRoute()?.name;
          setCurrentRouteName(initialRoute || null);
        }}
        onStateChange={() => {
          const routeName = navigationRef.current?.getCurrentRoute()?.name;
          setCurrentRouteName(routeName || null);
        }}
      >
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'MainTabs' : 'Landing'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#1e3a8a' },
        }}
      >
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen 
          name="ActivityDetail" 
          component={ActivityDetailScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="AddActivity" 
          component={AddActivityScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="EditActivity" 
          component={EditActivityScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="EditProfile" 
          component={EditProfileScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="ChangePassword" 
          component={ChangePasswordScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="HelpSupport" 
          component={HelpSupportScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="TermsConditions" 
          component={TermsConditionsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="PrivacyPolicy" 
          component={PrivacyPolicyScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
      </NavigationContainer>
      <AIGuestFloatingWidget
        visible={currentRouteName === 'Login' || currentRouteName === 'Register'}
        onNavigateLogin={() => {
          if (navigationRef.current?.isReady()) {
            navigationRef.current.navigate('Login');
          }
        }}
      />
    </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashRoot: {
    flex: 1,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center'
  },
  splashLogoWrap: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  splashLogo: {
    width: 220,
    height: 60
  }
});
