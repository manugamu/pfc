import React, { useEffect, useState, useContext } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { getValidAccessToken, logoutUser } from '../services/authService';
import { AuthContext } from '../context/AuthContext';

export default function PenyaChatWrapper() {
  const navigation = useNavigation();
  const { setIsLoggedIn } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const goToChat = async () => {
      try {
        const token = await getValidAccessToken(navigation, setIsLoggedIn);
        if (!token) return;

        const authData = await EncryptedStorage.getItem('auth');
        if (!authData) throw new Error('No hay sesión activa');

        const parsed = JSON.parse(authData);
        const { username, id: userId, profileImageUrl, role, fallaInfo } = parsed;

        if (!fallaInfo?.fallaCode) {
          console.error('No hay código de falla disponible');
          return;
        }

        navigation.replace('EventoChatScreen', {
          eventoId: fallaInfo.fallaCode,
          title: 'Chat de la Falla',
          location: 'Tu Falla',
          backgroundImage: 'https://source.unsplash.com/featured/?fireworks',
          creatorName: username,
          creatorId: userId,
        });
      } catch (err) {
        console.error('Error en PenyaChatWrapper:', err.message);
        await logoutUser(navigation, setIsLoggedIn);
      } finally {
        setLoading(false);
      }
    };

    goToChat();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color="#fd882d" />
      <Text style={{ marginTop: 10, color: '#fff' }}>Cargando chat de tu falla...</Text>
    </View>
  );
}
