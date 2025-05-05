import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import Evento from '../components/Eventos';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getValidAccessToken, logoutUser } from '../services/authService';
import { AuthContext } from '../context/AuthContext';
import { useBackground } from '../context/BackgroundContext';
import EncryptedStorage from 'react-native-encrypted-storage';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { setIsLoggedIn, role } = useContext(AuthContext);
  const { backgroundImage } = useBackground();

  const [eventosFallas, setEventosFallas] = useState([]);
  const [eventosFalleros, setEventosFalleros] = useState([]);
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
        await logoutUser(navigation, setIsLoggedIn);
        return;
      }

      const data = await res.json();
      const now = new Date();
      const activos = data.filter(evt => new Date(evt.endDate) > now);

      const fallas = activos.filter(e => e.creatorRole === 'FALLA');
      const falleros = activos.filter(e => e.creatorRole === 'FALLERO');

      setEventosFallas(fallas);
      setEventosFalleros(falleros);
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
      if (!token || !auth) return;

      const { id: fallaId } = JSON.parse(auth);

      const res = await fetch(`http://10.0.2.2:5000/api/falla/solicitudes/${fallaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.ok ? await res.json() : [];
      setNumSolicitudes(data.length || 0);
    } catch (err) {
      console.error('Error al obtener solicitudes:', err);
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
    <ImageBackground source={backgroundImage} style={styles.background}>
      <View style={styles.overlay}>
        <View style={styles.toolbar}>
          <Text style={styles.title}>Eventos</Text>
          {role === 'FALLA' && (
            <View style={styles.fallaButtons}>
              <TouchableOpacity onPress={() => navigation.navigate('SolicitudesFalla')} style={styles.iconButton}>
                <Image source={require('../assets/images/fallero.png')} style={styles.notificationIcon} />
                {numSolicitudes > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{numSolicitudes}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('CrearEvento')} style={styles.iconButton}>
                <Icon name="add-circle-outline" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          {role !== 'FALLA' && role !== 'USER' && (
            <TouchableOpacity onPress={() => navigation.navigate('CrearEvento')}>
              <Icon name="add-circle-outline" size={28} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color="#fff" size="large" style={{ marginTop: 20 }} />
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchEventos();
                  fetchSolicitudes();
                }}
                colors={['#fd882d']}
                tintColor="#fff"
              />
            }
          >
            <Text style={styles.sectionTitle}>Eventos creados por Fallas</Text>
            <FlatList
              data={eventosFallas}
              keyExtractor={(item) => item.id}
              horizontal
              renderItem={({ item }) => (
                <View style={{ marginRight: 12, paddingBottom: 24 }}>
                  <Evento {...item} backgroundImage={item.imageUrl} onPress={() => handleEventoPress(item)} />
                </View>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingVertical: 16,
                minHeight: 140,
                alignItems: 'flex-end',
              }}
              ListEmptyComponent={
                <Text style={styles.emptyMessage}>No hay eventos de fallas por ahora.</Text>
              }
            />

            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Eventos creados por Falleros</Text>
            <FlatList
              data={eventosFalleros}
              keyExtractor={(item) => item.id}
              horizontal
              renderItem={({ item }) => (
                <View style={{ marginRight: 12, paddingBottom: 24 }}>
                  <Evento {...item} backgroundImage={item.imageUrl} onPress={() => handleEventoPress(item)} />
                </View>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingVertical: 4,
                minHeight: 100,
                alignItems: 'flex-end',
              }}
              ListEmptyComponent={
                <Text style={styles.emptyMessage}>No hay eventos de falleros por ahora.</Text>
              }
            />
          </ScrollView>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.23)',
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
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  emptyMessage: {
    color: '#ddd',
    fontSize: 14,
    paddingHorizontal: 16,
    fontStyle: 'italic',
  },
});
