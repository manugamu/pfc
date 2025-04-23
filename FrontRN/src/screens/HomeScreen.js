import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import Evento from '../components/Eventos';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getValidAccessToken, logoutUser } from '../services/authService';
import { AuthContext } from '../context/AuthContext';
import EncryptedStorage from 'react-native-encrypted-storage';


export default function HomeScreen() {
  const navigation = useNavigation();
  const { setIsLoggedIn, role, userId } = useContext(AuthContext);

  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [numSolicitudes, setNumSolicitudes] = useState(0);

  const fetchEventos = async () => {
    try {
      const token = await getValidAccessToken(navigation, setIsLoggedIn);
      if (!token) return;

      const res = await fetch('http://10.0.2.2:5000/api/events', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        console.warn('🔐 Token revocado o inválido. Cerrando sesión...');
        await logoutUser(navigation, setIsLoggedIn);
        return;
      }

      if (!res.ok) throw new Error(`Error al cargar eventos: ${res.status}`);

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

  const fetchSolicitudes = async () => {
    try {
      if (role !== 'FALLA') return;
  
      const token = await getValidAccessToken(navigation, setIsLoggedIn);
      const auth = await EncryptedStorage.getItem('auth');
      if (!token || !auth) {
        console.log("🚫 Sin token o auth");
        return;
      }
  
      const { id: fallaId } = JSON.parse(auth);
      console.log("🟡 Falla ID usado:", fallaId);
  
      const res = await fetch(`http://10.0.2.2:5000/api/falla/solicitudes/${fallaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      if (res.ok) {
        const data = await res.json();
        console.log("🔔 Solicitudes recibidas:", data.length);
        setNumSolicitudes(data.length);
      } else {
        console.warn("⚠️ Respuesta no OK al obtener solicitudes");
        setNumSolicitudes(0);
      }
    } catch (err) {
      console.error('❌ Error al obtener solicitudes:', err);
      setNumSolicitudes(0);
    }
  };
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
    navigation.navigate('CrearEvento');
  };

  const handleNotificaciones = () => {
    navigation.navigate('SolicitudesFalla', {
      onGoBack: fetchSolicitudes, 
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEventos();
    fetchSolicitudes();
  };

  useEffect(() => {
    fetchEventos();
    fetchSolicitudes();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEventos();
      fetchSolicitudes();
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>Eventos</Text>
        {role === 'FALLA' && (
          <View style={styles.fallaButtons}>
            <TouchableOpacity onPress={handleNotificaciones} style={styles.iconButton}>
              <Image
                source={require('../assets/images/fallero.png')}
                style={styles.notificationIcon}
              />
              {console.log('🔢 numSolicitudes render:', numSolicitudes)}
              {numSolicitudes > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{numSolicitudes}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCreateEvent} style={styles.iconButton}>
              <Icon name="add-circle-outline" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        {role !== 'FALLA' && role !== 'USER' && (
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
  fallaButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    marginLeft: 8,
    position: 'relative',
  },
  notificationIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -6,
    backgroundColor: 'lime', 
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  badgeText: {
    color: 'black',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
