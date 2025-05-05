import React, { useEffect, useState, useCallback, useContext } from 'react';
import { Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import EncryptedStorage from 'react-native-encrypted-storage';

import HomeScreen from './HomeScreen';
import BusquedaScreen from './BusquedaScreen';
import PenyaFalleraScreen from './PenyaFalleraScreen';
import ProfileScreen from './ProfileScreen';
import { AuthContext } from '../context/AuthContext';
import { getValidAccessToken } from '../services/authService';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { setIsLoggedIn, role, setRole } = useContext(AuthContext);
  const [profileImageUrl, setProfileImageUrl] = useState(null);

  const fetchProfileData = async () => {
    try {
      const token = await getValidAccessToken(null, setIsLoggedIn, setRole);
      if (!token) return;

      const auth = await EncryptedStorage.getItem('auth');
      if (auth) {
        const parsed = JSON.parse(auth);
        setProfileImageUrl(
          parsed.profileImageUrl?.trim() !== '' ? parsed.profileImageUrl : null
        );
      }
    } catch (error) {
      console.error('Error obteniendo datos de perfil:', error);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
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
                  borderColor: focused ? '#007aff' : 'transparent',
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
            case 'Penya Fallera':
              iconName = 'chatbox-ellipses-outline';
              break;
            default:
              iconName = 'ellipse';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />

      <Tab.Screen name="Search" component={BusquedaScreen} />

      {(role === 'FALLA' || role === 'FALLERO') && (
        <Tab.Screen name="Penya Fallera" component={PenyaFalleraScreen} />
      )}

      <Tab.Screen
        name="Profile"
        children={(props) => (
          <ProfileScreen
            {...props}
            setProfileImageUrl={setProfileImageUrl}
            setIsLoggedIn={setIsLoggedIn}
          />
        )}
      />
    </Tab.Navigator>
  );
}
