import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import EncryptedStorage from 'react-native-encrypted-storage';

import ProfileScreen from './ProfileScreen';
import HomeScreen from './HomeScreen';

const Tab = createBottomTabNavigator();

const DummyScreen = ({ label }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{label}</Text>
  </View>
);

const SearchScreen = () => <DummyScreen label="Search" />;
const MessagesScreen = () => <DummyScreen label="Messages" />;

export default function MainTabs({ setIsLoggedIn }) {
  const [profileImageUrl, setProfileImageUrl] = useState(null);

  const fetchProfileImage = async () => {
    try {
      const auth = await EncryptedStorage.getItem('auth');
      if (auth) {
        const parsed = JSON.parse(auth);
        setProfileImageUrl(parsed.profileImageUrl && parsed.profileImageUrl.trim() !== '' ? parsed.profileImageUrl : null);
      }
    } catch (error) {
      console.error('❌ Error obteniendo imagen de perfil:', error);
    }
  };

  useEffect(() => {
    fetchProfileImage();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfileImage();
    }, [])
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#007aff',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarStyle: { paddingVertical: 8, height: 60 },
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === 'Profile') {
            return (
              <Image
                source={
                  profileImageUrl
                    ? { uri: profileImageUrl }
                    : require('../assets/images/default-avatar.png')
                }
                style={{
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderWidth: focused ? 2 : 0,
                  borderColor: focused ? '#007aff' : 'transparent'
                }}
              />
            );
          }
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = 'home-outline';
              break;
            case 'Search':
              iconName = 'search-outline';
              break;
            case 'Messages':
              iconName = 'chatbox-ellipses-outline';
              break;
            default:
              iconName = 'ellipse';
          }
          return <Icon name={iconName} size={size} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Home">
        {(props) => <HomeScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
      </Tab.Screen>
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile">
        {(props) => (
          <ProfileScreen
            {...props}
            setIsLoggedIn={setIsLoggedIn}
            setProfileImageUrl={setProfileImageUrl}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
