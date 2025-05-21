import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { getValidAccessToken } from '../services/authService';
import { API_BASE_URL } from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_CHARS = 30;

export default function Evento({
  id,
  backgroundImage,
  creatorId,
  creatorName,
  creatorRole,
  title,
  location,
  startDate,
  endDate,
  description,
  createdAt,
  onPress,
  miId,
  refreshEventos,
}) {
  const navigation = useNavigation();
  const [creatorImage, setCreatorImage] = useState(null);
  const [fallaName, setFallaName] = useState(null);
  const [fallaImage, setFallaImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);


  const isOwn = miId === creatorId;
  const gradientColors = isOwn
    ? ['#32CD32', '#228B22']
    : ['#FFD700', '#FFA500'];

  useEffect(() => {
    async function fetchData() {
      try {
        const resUser = await fetch(`${API_BASE_URL}/api/users/${creatorId}`);
        const user = await resUser.json();
        setCreatorImage(user.profileImageUrl);

        let fallaCode = null;
        if (user.role === 'FALLERO') fallaCode = user.codigoFalla;
        else if (user.role === 'USER') fallaCode = user.fallaInfo?.fallaCode;

        if (fallaCode) {
          const resFalla = await fetch(`${API_BASE_URL}/api/falla/codigo/${fallaCode}`);
          const falla = await resFalla.json();
          setFallaName(falla.fullname || falla.username);
          setFallaImage(falla.profileImageUrl);
        }
      } catch (e) {
        console.warn('Error cargando creador/falla:', e);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [creatorId]);

  const openLocation = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    Linking.openURL(url).catch(() => { });
  };

  const fmt = (d, opts) => new Date(d).toLocaleString('es-ES', opts);
  const toggleDescription = () => setShowFullDescription(!showFullDescription);
  const shouldTruncate = description.length > MAX_CHARS;

  const handleLongPress = () => {
    if (!isOwn) return;
    Alert.alert(
      'Opciones',
      'Selecciona una acción:',
      [
        {
          text: 'Modificar evento',
          onPress: () =>
            navigation.navigate('CrearEvento', {
              event: { id, title, location, description, imageUrl: backgroundImage, startDate, endDate, createdAt },
            }),
        },
        {
          text: 'Eliminar evento',
          style: 'destructive',
          onPress: handleDelete,
        },
        { text: 'Cancelar', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };


  const handleDelete = async () => {
    try {
      const token = await getValidAccessToken(navigation);
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/events/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 204) {
        Alert.alert('Evento eliminado');
        refreshEventos();
      } else if (res.status === 404) {
        Alert.alert('Error', 'Evento no encontrado');
      } else {
        Alert.alert('Error', 'No se pudo eliminar el evento');
      }
    } catch (err) {
      console.error('Error eliminando evento:', err);
      Alert.alert('Error', 'Error eliminando el evento');
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.9}
      style={styles.container}
    >
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Image source={{ uri: backgroundImage }} style={styles.backgroundImage} />
            <View style={styles.overlay} />

            <View style={styles.headerContent}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <View style={styles.rowSpaceBetween}>
                    <View style={[styles.profileContent, creatorRole === 'FALLA' && styles.fallaCreatorOverlay]}>
                      <Image
                        source={
                          creatorImage
                            ? { uri: creatorImage }
                            : require('../assets/images/default-avatar.png')
                        }
                        style={styles.avatar}
                      />
                      <View style={styles.nameBlock}>
                        <Text style={styles.creatorName}>{creatorName}</Text>
                        {creatorRole === 'FALLERO' && fallaName && (
                          <View style={styles.fallaUnderBlock}>
                            {fallaImage ? (
                              <Image source={{ uri: fallaImage }} style={styles.fallaMiniAvatar} />
                            ) : (
                              <Ionicons name="people-outline" size={14} color="#fff" style={{ marginRight: 5 }} />
                            )}
                            <Text style={styles.fallaOverlayText} numberOfLines={2} ellipsizeMode="tail">
                              {fallaName}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <Text style={styles.title} numberOfLines={2}>
                    {title}
                  </Text>

                  <View style={styles.descriptionContainer}>
                    <Text style={styles.description} numberOfLines={showFullDescription ? undefined : 1}>
                      {showFullDescription
                        ? description
                        : `${description.slice(0, MAX_CHARS)}${shouldTruncate ? '...' : ''}`}
                    </Text>
                    {shouldTruncate ? (
                      <TouchableOpacity onPress={toggleDescription} style={styles.expandButton}>
                        <Text style={styles.expandText}>
                          {showFullDescription ? '▲ Ver menos' : '▼ Ver más'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.expandPlaceholder} />
                    )}
                  </View>

                  <TouchableOpacity style={styles.locationPill} onPress={openLocation}>
                    <Ionicons name="location-outline" size={16} color="#1E90FF" />
                    <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.datesRow}>
              <View style={styles.dateBlock}>
                <Ionicons name="calendar-outline" size={14} color="#bbb" />
                <Text style={styles.dateLabel}>Comienza</Text>
                <Text style={styles.dateValue}>
                  {fmt(startDate, { day: 'numeric', month: 'long' })} ·{' '}
                  {fmt(startDate, { hour: '2-digit', minute: '2-digit', hour12: false })}
                </Text>
              </View>
              <View style={styles.dateBlock}>
                <Ionicons name="calendar-outline" size={14} color="#bbb" />
                <Text style={styles.dateLabel}>Acaba</Text>
                <Text style={styles.dateValue}>
                  {fmt(endDate, { day: 'numeric', month: 'long' })} ·{' '}
                  {fmt(endDate, { hour: '2-digit', minute: '2-digit', hour12: false })}
                </Text>
              </View>
            </View>

            <Text style={styles.published}>
              Publicado el {fmt(createdAt, { day: 'numeric', month: 'long', year: 'numeric' })} a las{' '}
              {fmt(createdAt, { hour: '2-digit', minute: '2-digit', hour12: false })}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', alignItems: 'center', marginVertical: 8 },
  gradient: {
    borderRadius: 20,
    padding: 2,
  },
  card: {
    backgroundColor: '#1f1f1f',
    borderRadius: 18,
    overflow: 'hidden',
    width: SCREEN_WIDTH * 0.6,
    maxWidth: 240,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  header: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#000',
  },
  headerContent: {
    padding: 12,
    paddingTop: 14,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  rowSpaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  creatorName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameBlock: {
    flexDirection: 'column',
  },
  fallaCreatorOverlay: {
    backgroundColor: '#DAA520',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 35,
  },
  fallaUnderBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#DAA520',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
    maxWidth: 180,
    flexWrap: 'wrap',
  },
  fallaMiniAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 5,
    marginTop: 2,
  },
  fallaOverlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    flexShrink: 1,
    flexWrap: 'wrap',
    textAlign: 'left',
    maxWidth: 140,
  },
  title: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    minHeight: 48,
    lineHeight: 24,
  },
  descriptionContainer: {
    minHeight: 42,
    justifyContent: 'center',
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    color: '#eee',
    textAlign: 'center',
  },
  expandButton: {
    marginTop: 4,
    alignItems: 'center',
  },
  expandText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E90FF',
  },
  expandPlaceholder: {
    height: 18,
    marginTop: 4,
  },
  locationPill: {
    marginTop: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(39, 37, 37, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    color: '#ddd',
    marginLeft: 6,
    fontSize: 12,
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  dateBlock: {
    alignItems: 'center',
    maxWidth: '48%',
  },
  dateLabel: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },
  dateValue: {
    color: '#fff',
    fontSize: 14,
    marginTop: 2,
    textAlign: 'center',
  },
  published: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    minHeight: 34,
    textAlignVertical: 'center',
  },
});
