import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import { getValidAccessToken, logoutUser } from '../services/authService';
import EncryptedStorage from 'react-native-encrypted-storage';

export default function SolicitudesFalla({ navigation }) {
  const { setIsLoggedIn } = useContext(AuthContext);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSolicitudes = async () => {
    try {
      const token = await getValidAccessToken(navigation, setIsLoggedIn);
      if (!token) return;

      const auth = await EncryptedStorage.getItem('auth');
      const { id: fallaId } = JSON.parse(auth);

      const res = await fetch(
        `http://10.0.2.2:5000/api/falla/solicitudes/${fallaId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Error obteniendo solicitudes');

      const data = await res.json();
      setSolicitudes(data);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudieron obtener las solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const aceptarUsuario = async (userId) => {
    try {
      const token = await getValidAccessToken(navigation, setIsLoggedIn);
      if (!token) return;

      const auth = await EncryptedStorage.getItem('auth');
      const { id: fallaId } = JSON.parse(auth);

      const res = await fetch(`http://10.0.2.2:5000/api/falla/aceptar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, fallaId })
      });
      if (!res.ok) throw new Error();

      Alert.alert('✅ Usuario aceptado');
      fetchSolicitudes();
    } catch (err) {
      console.error('Error al aceptar usuario:', err);
      Alert.alert('❌ Error al aceptar usuario');
    }
  };

  const rechazarUsuario = async (userId) => {
    try {
      const token = await getValidAccessToken(navigation, setIsLoggedIn);
      if (!token) return;

      const auth = await EncryptedStorage.getItem('auth');
      const { id: fallaId } = JSON.parse(auth);

      const res = await fetch(`http://10.0.2.2:5000/api/falla/rechazar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, fallaId })
      });
      if (!res.ok) throw new Error();

      Alert.alert('🚫 Solicitud rechazada');
      fetchSolicitudes();
    } catch (err) {
      console.error('Error al rechazar usuario:', err);
      Alert.alert('❌ Error al rechazar usuario');
    }
  };

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image
        source={
          item.profileImageUrl
            ? { uri: item.profileImageUrl }
            : require('../assets/images/default-avatar.png')
        }
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.fullName}>{item.fullName}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.aceptarBtn}
          onPress={() => aceptarUsuario(item.id)}
        >
          <Text style={styles.aceptarText}>Aceptar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rechazarBtn}
          onPress={() => rechazarUsuario(item.id)}
        >
          <Text style={styles.rechazarText}>Rechazar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Solicitudes de Unión</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={solicitudes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f1f1f',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  fullName: {
    color: '#bbb',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'column',
  },
  aceptarBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginBottom: 6,
  },
  aceptarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  rechazarBtn: {
    backgroundColor: '#f44336',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  rechazarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
