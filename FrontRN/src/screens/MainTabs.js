import React, { useEffect, useState, useCallback, useContext } from 'react';
import { Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome6';
import EncryptedStorage from 'react-native-encrypted-storage';
import { Dimensions } from 'react-native';


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

  const screenWidth = Dimensions.get('window').width;
  const iconSize = screenWidth * 0.04; // ajusta este factor si lo quieres más o menos pequeño


  return (
    <Tab.Navigator
  screenOptions={({ route }) => {
    const screenWidth = Dimensions.get('window').width;
    const iconSize = screenWidth * 0.043;

    return {
      headerShown: false,
      tabBarActiveTintColor: 'tomato',
      tabBarInactiveTintColor: 'grey',
      tabBarStyle: {
        paddingVertical: 8,
        height: 60,
        backgroundColor: 'black',
      },
      tabBarIcon: ({ color, focused }) => {
        if (route.name === 'Perfil') {
          return (
            <Image
              source={
                profileImageUrl
                  ? { uri: profileImageUrl }
                  : require('../assets/images/default-avatar.png')
              }
              style={{
                width: iconSize,
                height: iconSize,
                borderRadius: iconSize / 2,
                borderWidth: focused ? 2 : 0,
                borderColor: focused ? 'tomato' : 'transparent',
              }}
            />
          );
        }

        let iconName;
        switch (route.name) {
          case 'Eventos':
            iconName = 'house';
            break;
          case 'Busquedas':
            iconName = 'magnifying-glass';
            break;
          case 'Penya Fallera':
            iconName = 'comment-dots';
            break;
          default:
            iconName = 'circle';
        }

        return <Icon name={iconName} size={iconSize} color={color} />;
      },
    };
  }}
>

      <Tab.Screen name="Eventos" component={HomeScreen} />

      <Tab.Screen name="Busquedas" component={BusquedaScreen} />

      {(role === 'FALLA' || role === 'FALLERO') && (
        <Tab.Screen name="Penya Fallera" component={PenyaFalleraScreen} />
      )}

      <Tab.Screen
        name="Perfil"
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
