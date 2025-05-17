import React, { useEffect, useState, useContext } from 'react';
import { ActivityIndicator, View, Alert } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import EventoChatScreen from './EventoChatScreen';
import { AuthContext } from '../context/AuthContext';
import { getValidAccessToken } from '../services/authService';
import { API_BASE_URL } from '../config';


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
          console.warn('Usuario aún no tiene código de falla');
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

    let didCancel = false;

    const fetchFalla = async () => {
      try {
        const token = await getValidAccessToken(navigation, setIsLoggedIn);
        if (!token || didCancel) return;

        const res = await fetch(`${API_BASE_URL}/api/falla/codigo/${codigoFalla}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          console.error('No se pudo cargar info de la falla');
          return;
        }

        const fallaInfo = await res.json();
        const authData = await EncryptedStorage.getItem('auth');
        const parsed = JSON.parse(authData);

        if (!didCancel) {
          setEventData({
            eventoId: codigoFalla,
            title: fallaInfo.fullname || 'Penya Fallera',
            backgroundImage: fallaInfo.profileImageUrl,
            creatorId: parsed.id,
            creatorName: fallaInfo.username,
            creatorImage: fallaInfo.profileImageUrl || null
          });
        }
      } catch (err) {
        if (!didCancel) {
          console.error('Error al cargar info de la falla:', err);
        }
      }
    };

    fetchFalla();

    return () => {
      didCancel = true;
    };
  }, [codigoFalla, navigation, setIsLoggedIn]);

  if (!eventData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#fd882d" />
      </View>
    );
  }

  return <EventoChatScreen route={{ params: eventData }} />;
}
