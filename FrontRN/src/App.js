import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import RegisterScreen from './screens/RegisterScreen';
import LoginScreen from './screens/LoginScreen';
import MainTabs from './screens/MainTabs';
import EventoChatScreen from './screens/EventoChatScreen';
import CrearEventoScreen from './screens/CrearEventoScreen';
import SolicitudesFalla from './screens/SolicitudesFalla';

import { AuthProvider, AuthContext } from './context/AuthContext';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { isLoggedIn } = useContext(AuthContext);

  if (isLoggedIn === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#fd882d" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="EventoChatScreen" component={EventoChatScreen} />
            <Stack.Screen name="CrearEvento" component={CrearEventoScreen} />
            <Stack.Screen name="SolicitudesFalla" component={SolicitudesFalla} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
