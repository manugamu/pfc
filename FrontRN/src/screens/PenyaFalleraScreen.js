import React, { useEffect, useState, useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import EventoChatScreen from './EventoChatScreen';
import { AuthContext } from '../context/AuthContext';
import { getValidAccessToken } from '../services/authService';

export default function PenyaFalleraScreen({ navigation }) {
  const [eventData, setEventData] = useState(null);
  const [codigoFalla, setCodigoFalla] = useState(null);
  const { setIsLoggedIn } = useContext(AuthContext);

  useEffect(() => {
    const getCodigoFalla = async () => {
      try {
        const authData = await EncryptedStorage.getItem('auth');
        if (!authData) return;

        const parsed = JSON.parse(authData);
        const code =
          parsed?.fallaInfo?.fallaCode || parsed?.codigoFalla || null;

        if (!code) {
          console.warn('⚠️ Usuario aún no tiene código de falla');
          return;
        }

        setCodigoFalla(code);
      } catch (err) {
        console.error('Error al cargar código de falla:', err);
      }
    };

    getCodigoFalla();
  }, []);

  useEffect(() => {
    if (!codigoFalla) return;

    const fetchFalla = async () => {
      try {
        const token = await getValidAccessToken(navigation, setIsLoggedIn);
        if (!token) {
          console.error('❌ No se pudo obtener token válido');
          return;
        }

        const res = await fetch(`http://10.0.2.2:5000/api/falla/codigo/${codigoFalla}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!res.ok) {
          console.error('❌ No se pudo cargar info de la falla');
          return;
        }

        const fallaInfo = await res.json();

        const authData = await EncryptedStorage.getItem('auth');
        const parsed = JSON.parse(authData);

        console.log('📸 Image fallback:', fallaInfo?.profileImageUrl);
        console.log('📦 EventData:', {
          eventoId: codigoFalla,
          title: fallaInfo?.fullname,
          creatorImage: fallaInfo?.profileImageUrl
        });

        setEventData({
          eventoId: codigoFalla,
          title: fallaInfo.fullname,
          backgroundImage: '',
          creatorId: parsed.id,
          creatorName: fallaInfo.username,
          creatorImage: fallaInfo.profileImageUrl || null
        });
      } catch (err) {
        console.error('Error al cargar info de la falla:', err);
      }
    };

    fetchFalla();
  }, [codigoFalla]);

  if (!eventData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#fd882d" />
      </View>
    );
  }

  return <EventoChatScreen route={{ params: eventData }} />;
}
