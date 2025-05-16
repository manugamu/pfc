// src/screens/HomeScreen.js

import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
  RefreshControl,
  ImageBackground,
  Dimensions,
} from 'react-native';
import LottieView from 'lottie-react-native';
import Evento from '../components/Eventos';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getValidAccessToken, logoutUser } from '../services/authService';
import { AuthContext } from '../context/AuthContext';
import { useBackground } from '../context/BackgroundContext';
import EncryptedStorage from 'react-native-encrypted-storage';
import { API_BASE_URL } from '../config';

const screenWidth = Dimensions.get('window').width;

export default function HomeScreen() {
  const navigation = useNavigation();
  const { setIsLoggedIn, role } = useContext(AuthContext);
  const { backgroundImage } = useBackground();

  const [eventosFallas, setEventosFallas] = useState([]);
  const [eventosFalleros, setEventosFalleros] = useState([]);
  const [misEventos, setMisEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [numSolicitudes, setNumSolicitudes] = useState(0);
  const [miId, setMiId] = useState(null);

  const scrollRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showButton, setShowButton] = useState(false);

  const fetchEventos = async () => {
    try {
      const auth = await EncryptedStorage.getItem('auth');
      const parsed = auth ? JSON.parse(auth) : null;
      setMiId(parsed?.id);

      const token = await getValidAccessToken(navigation, setIsLoggedIn);
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        await logoutUser(navigation, setIsLoggedIn);
        return;
      }
      const data = await res.json();
      const now = new Date();
      const activos = data.filter(evt => new Date(evt.endDate) > now);
      setEventosFallas(activos.filter(e => e.creatorRole === 'FALLA'));
      setEventosFalleros(activos.filter(e => e.creatorRole === 'FALLERO'));
      setMisEventos(parsed?.id ? activos.filter(e => e.creatorId === parsed.id) : []);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los eventos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSolicitudes = async () => {
    if (role !== 'FALLA') return;
    const token = await getValidAccessToken(navigation, setIsLoggedIn);
    if (!token) return;
    const resUser = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resUser.ok) return;
    const userData = await resUser.json();
    const res = await fetch(`${API_BASE_URL}/api/falla/solicitudes/${userData.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = res.ok ? await res.json() : [];
    setNumSolicitudes(data.length || 0);
  };

  useEffect(() => {
    fetchEventos();
    fetchSolicitudes();
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      fetchEventos();
      fetchSolicitudes();
    });
    return unsub;
  }, [navigation]);

  const handleScroll = ({ nativeEvent }) => {
    const show = nativeEvent.contentOffset.y > 200;
    if (show !== showButton) {
      Animated.timing(fadeAnim, {
        toValue: show ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setShowButton(show);
    }
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.background}>
      <View style={styles.overlay}>
        {/* Toolbar */}
        <View style={styles.toolbar}>
          <Text style={styles.title}>Eventos</Text>
          {role === 'FALLA' ? (
            <View style={styles.fallaButtons}>
              <TouchableOpacity
                onPress={() => navigation.navigate('SolicitudesFalla')}
                style={styles.iconButton}
              >
                <Image
                  source={require('../assets/images/fallero.png')}
                  style={styles.notificationIcon}
                />
                {numSolicitudes > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{numSolicitudes}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('CrearEvento')}
                style={styles.iconButton}
              >
                <Icon name="add-circle-outline" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            role !== 'USER' && (
              <TouchableOpacity onPress={() => navigation.navigate('CrearEvento')}>
                <Icon name="add-circle-outline" size={28} color="#fff" />
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Content */}
        {loading ? (
          <ActivityIndicator color="#fff" size="large" style={{ marginTop: 20 }} />
        ) : (
          <Animated.ScrollView
            ref={scrollRef}
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
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            <Text style={styles.sectionTitle}>Eventos creados por Fallas</Text>
            <FlatList
              data={eventosFallas}
              keyExtractor={item => item.id}
              horizontal
              renderItem={({ item }) => (
                <View style={{ marginRight: 12, paddingBottom: 24 }}>
                  <Evento
                    {...item}
                    miId={miId}
                    backgroundImage={item.imageUrl}
                    onPress={() =>
                      navigation.navigate('EventoChatScreen', {
                        eventoId: item.id,
                        title: item.title,
                        location: item.location,
                        backgroundImage: item.imageUrl,
                        creatorName: item.creatorName,
                        creatorId: item.creatorId,
                      })
                    }
                    refreshEventos={fetchEventos}
                  />
                </View>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingVertical: 4,
                minHeight: 120,
                alignItems: 'flex-end',
              }}
              ListEmptyComponent={
                <Text style={styles.emptyMessage}>No hay eventos de fallas por ahora.</Text>
              }
            />

            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>
              Eventos creados por Falleros
            </Text>
            <FlatList
              data={eventosFalleros}
              keyExtractor={item => item.id}
              horizontal
              renderItem={({ item }) => (
                <View style={{ marginRight: 12, paddingBottom: 24 }}>
                  <Evento
                    {...item}
                    miId={miId}
                    backgroundImage={item.imageUrl}
                    onPress={() =>
                      navigation.navigate('EventoChatScreen', {
                        eventoId: item.id,
                        title: item.title,
                        location: item.location,
                        backgroundImage: item.imageUrl,
                        creatorName: item.creatorName,
                        creatorId: item.creatorId,
                      })
                    }
                    refreshEventos={fetchEventos}
                  />
                </View>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingVertical: 2,
                minHeight: 70,
                alignItems: 'flex-end',
              }}
              ListEmptyComponent={
                <Text style={styles.emptyMessage}>No hay eventos de falleros por ahora.</Text>
              }
            />

            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Mis Eventos</Text>
            {role === 'USER' ? (
              <View style={styles.sectionOverlay}>
                <View style={styles.lockedContainer}>
                  <LottieView
        source={require('../assets/animations/lock.json')}
        autoPlay
        loop
        style={styles.lockAnimation}
      />
                  <Text style={styles.lockedText}>
                    Esta sección está bloqueada. Para empezar a crear eventos, únete a tu falla.
                  </Text>
                  <TouchableOpacity style={styles.joinButton} onPress={() => navigation.navigate('Perfil')}>
                    <Text style={styles.joinButtonText}>Unete a tu falla</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <FlatList
                data={misEventos}
                keyExtractor={item => item.id}
                horizontal
                renderItem={({ item }) => (
                  <View style={{ marginRight: 12, paddingBottom: 24 }}>
                    <Evento
                      {...item}
                      miId={miId}
                      backgroundImage={item.imageUrl}
                      onPress={() =>
                        navigation.navigate('EventoChatScreen', {
                          eventoId: item.id,
                          title: item.title,
                          location: item.location,
                          backgroundImage: item.imageUrl,
                          creatorName: item.creatorName,
                          creatorId: item.creatorId,
                        })
                      }
                      refreshEventos={fetchEventos}
                    />
                  </View>
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingVertical: 2,
                  minHeight: 70,
                  alignItems: 'flex-end',
                }}
                ListEmptyComponent={
                  <Text style={styles.emptyMessage}>No has creado eventos todavía.</Text>
                }
              />
            )}
          </Animated.ScrollView>
        )}

        {/* Scroll-to-top arrow (Lottie) */}
        <Animated.View
          pointerEvents={showButton ? 'auto' : 'none'}
          style={[styles.scrollTopContainer, { opacity: fadeAnim }]}
        >
          <TouchableOpacity onPress={scrollToTop}>
            <LottieView
              source={require('../assets/animations/arrow.json')}
              autoPlay
              loop
              style={{
                width: screenWidth * 0.19,
                height: screenWidth * 0.19,
                transform: [{ rotate: '180deg' }],
              }}
            />
          </TouchableOpacity>
        </Animated.View>
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
    paddingTop: screenWidth * 0.05,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: screenWidth * 0.04,
    marginBottom: screenWidth * 0.03,
  },
  title: {
    fontSize: screenWidth * 0.065,
    fontWeight: 'bold',
    color: '#fff',
  },

  lockAnimation: {
  width: screenWidth * 0.2,
  height: screenWidth * 0.2,
  marginBottom: screenWidth * 0.03,
},


  fallaButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: screenWidth * 0.04,
  },
  iconButton: {
    marginLeft: screenWidth * 0.02,
    position: 'relative',
  },
  notificationIcon: {
    width: screenWidth * 0.07,
    height: screenWidth * 0.07,
    resizeMode: 'contain',
  },
  badge: {
    position: 'absolute',
    right: -screenWidth * 0.015,
    top: -screenWidth * 0.015,
    backgroundColor: 'lime',
    borderRadius: screenWidth * 0.025,
    width: screenWidth * 0.045,
    height: screenWidth * 0.045,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  badgeText: {
    color: 'black',
    fontSize: screenWidth * 0.03,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: screenWidth * 0.05,
    fontWeight: 'bold',
    marginTop: screenWidth * 0.03,
    marginBottom: screenWidth * 0.01,
    paddingHorizontal: screenWidth * 0.04,
  },
  emptyMessage: {
    color: '#ddd',
    fontSize: screenWidth * 0.04,
    paddingHorizontal: screenWidth * 0.04,
    fontStyle: 'italic',
  },
  sectionOverlay: {
    marginHorizontal: screenWidth * 0.04,
    marginTop: screenWidth * 0.03,
    marginBottom: screenWidth * 0.06,
    padding: screenWidth * 0.04,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: screenWidth * 0.04,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  lockedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedText: {
    color: '#fff',
    fontSize: screenWidth * 0.045,
    textAlign: 'center',
    marginBottom: screenWidth * 0.03,
    fontStyle: 'italic',
  },
  joinButton: {
    backgroundColor: '#fd882d',
    paddingHorizontal: screenWidth * 0.05,
    paddingVertical: screenWidth * 0.025,
    borderRadius: screenWidth * 0.03,
    marginTop: screenWidth * 0.01,
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: screenWidth * 0.04,
  },
  scrollTopContainer: {
    position: 'absolute',
    top: screenWidth * 0.07,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
