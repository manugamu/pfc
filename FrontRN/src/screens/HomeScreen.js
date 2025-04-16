import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import Evento from '../components/Eventos';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getValidAccessToken, logoutUser } from '../services/authService';
import EncryptedStorage from 'react-native-encrypted-storage';

export default function HomeScreen({ setIsLoggedIn }) {
  const navigation = useNavigation();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const handleEventoPress = (evento) => {
    navigation.navigate('EventoChatScreen', {
      eventoId: evento.id,
      title: evento.title,
      location: evento.location,
      backgroundImage: evento.imageUrl,
      creatorName: evento.creatorName,
      creatorId: evento.creatorId,
    });
  };

  const handleCreateEvent = () => {
    navigation.navigate('CrearEvento', {
      setIsLoggedIn,
    });
  };

  const fetchEventos = async () => {
    try {
      const token = await getValidAccessToken(navigation);
      if (!token) return;

      const res = await fetch('http://10.0.2.2:5000/api/events', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401 || res.status === 403) {
        console.warn('🔐 Token revocado o inválido. Cerrando sesión...');
        await logoutUser(navigation);
        setIsLoggedIn(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Error al cargar eventos: ${res.status}`);
      }

      const data = await res.json();
      setEventos(data);
    } catch (err) {
      console.error('Error cargando eventos:', err);
      Alert.alert('Error', 'No se pudieron cargar los eventos. Intenta más tarde.');
    } finally {
      setLoading(false);
      setRefreshing(false); 
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEventos();
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setLoading(true);
      fetchEventos();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const auth = await EncryptedStorage.getItem('auth');
        if (auth) {
          const parsed = JSON.parse(auth);
          setUserRole(parsed.role);
          console.log("🔐 Rol del usuario:", parsed.role);
        }
      } catch (err) {
        console.error('Error obteniendo el rol del usuario:', err);
      }
    };
    getUserRole();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>Eventos</Text>
        {userRole !== 'USER' && userRole !== 'USUARIO' && (
          <TouchableOpacity onPress={handleCreateEvent}>
            <Icon name="add-circle-outline" size={28} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#fff" size="large" style={{ marginTop: 20 }} />
      ) : eventos.length === 0 ? (
        <Text style={styles.noEventsText}>No hay eventos por ahora.</Text>
      ) : (
        <FlatList
          data={eventos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Evento {...item} onPress={() => handleEventoPress(item)} />
          )}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 20,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  noEventsText: {
    color: '#ccc',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
  },
});
