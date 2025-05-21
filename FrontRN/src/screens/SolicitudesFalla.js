import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  ScrollView
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Dialog from 'react-native-dialog';
import EncryptedStorage from 'react-native-encrypted-storage';
import { AuthContext } from '../context/AuthContext';
import { getValidAccessToken } from '../services/authService';
import { API_BASE_URL } from '../config';

export default function GestionFalleros({ navigation }) {
  const { setIsLoggedIn } = useContext(AuthContext);
  const [solicitudes, setSolicitudes] = useState([]);
  const [falleros, setFalleros] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [processingDelete, setProcessingDelete] = useState(false);

  const [pwDialogVisible, setPwDialogVisible] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await getValidAccessToken(navigation, setIsLoggedIn);
      if (!token) return;

      const meRes = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!meRes.ok) throw new Error('Sin permiso');
      const me = await meRes.json();
      if (me.role !== 'FALLA') {
        Alert.alert('Sin permiso', 'Sólo la falla puede ver este listado');
        setSolicitudes([]);
        setFalleros([]);
        return;
      }

      const { id: fallaId } = JSON.parse(await EncryptedStorage.getItem('auth'));

      const resSol = await fetch(
        `${API_BASE_URL}/api/falla/solicitudes/${fallaId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!resSol.ok) throw new Error('Error obteniendo solicitudes');
      setSolicitudes(await resSol.json());

      const resFall = await fetch(
        `${API_BASE_URL}/api/falla/${fallaId}/falleros`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!resFall.ok) throw new Error('Error obteniendo falleros');
      setFalleros(await resFall.json());

    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const aceptarUsuario = async userId => {
    try {
      const token = await getValidAccessToken(navigation, setIsLoggedIn);
      if (!token) return;
      const { id: fallaId } = JSON.parse(await EncryptedStorage.getItem('auth'));

      const res = await fetch(`${API_BASE_URL}/api/falla/aceptar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, fallaId })
      });
      if (!res.ok) throw new Error();
      Alert.alert('✅ Usuario aceptado');
      fetchData();
    } catch {
      Alert.alert('❌ Error al aceptar usuario');
    }
  };

  const rechazarUsuario = async userId => {
    try {
      const token = await getValidAccessToken(navigation, setIsLoggedIn);
      if (!token) return;
      const { id: fallaId } = JSON.parse(await EncryptedStorage.getItem('auth'));

      const res = await fetch(`${API_BASE_URL}/api/falla/rechazar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, fallaId })
      });
      if (!res.ok) throw new Error();
      Alert.alert('🚫 Solicitud rechazada');
      fetchData();
    } catch {
      Alert.alert('❌ Error al rechazar usuario');
    }
  };

  const confirmAndDelete = () => {
    setPasswordInput('');
    setPwDialogVisible(true);
  };

  const handleDeleteFallero = async password => {
    setPwDialogVisible(false);
    if (!selectedUser) return;
    setProcessingDelete(true);
    try {
      const token = await getValidAccessToken(navigation, setIsLoggedIn);
      if (!token) return;
      const { id: fallaId } = JSON.parse(await EncryptedStorage.getItem('auth'));

      const res = await fetch(
        `${API_BASE_URL}/api/falla/${fallaId}/fallero/${selectedUser.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        }
      );
      if (!res.ok) throw new Error();
      Alert.alert('✅ Fallero eliminado');
      setModalVisible(false);
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo eliminar');
    } finally {
      setProcessingDelete(false);
    }
  };


  const renderSolicitudItem = ({ item }) => (
    <View style={styles.solicitudCard}>
      <Image
        source={item.profileImageUrl
          ? { uri: item.profileImageUrl }
          : require('../assets/images/default-avatar.png')}
        style={styles.solicitudAvatar}
      />
      <Text style={styles.solicitudName}>{item.username}</Text>
      <View style={styles.solicitudActions}>
        <TouchableOpacity onPress={() => aceptarUsuario(item.id)}>
          <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => rechazarUsuario(item.id)}>
          <Ionicons name="close-circle-outline" size={24} color="#f44336" />
        </TouchableOpacity>
      </View>
    </View>
  );


  const renderFalleroItem = ({ item }) => (
    <TouchableOpacity
      style={styles.falleroCard}
      onPress={() => { setSelectedUser(item); setModalVisible(true); }}
    >
      <Image
        source={item.profileImageUrl
          ? { uri: item.profileImageUrl }
          : require('../assets/images/default-avatar.png')}
        style={styles.falleroAvatar}
      />
      <View style={styles.falleroInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.fullName}>{item.fullName}</Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      <Dialog.Container visible={pwDialogVisible}>
        <Dialog.Title>Eliminar Fallero</Dialog.Title>
        <Dialog.Input
          placeholder="Contraseña de Falla"
          secureTextEntry
          value={passwordInput}
          onChangeText={setPasswordInput}
        />
        <Dialog.Button label="Cancelar" onPress={() => setPwDialogVisible(false)} />
        <Dialog.Button
          label="Eliminar"
          onPress={() => handleDeleteFallero(passwordInput)}
        />
      </Dialog.Container>

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Gestión de Falleros</Text>
      </View>

      {solicitudes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Solicitudes</Text>
          <FlatList
            data={solicitudes}
            keyExtractor={item => item.id}
            renderItem={renderSolicitudItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.solicitudesList}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tus Falleros</Text>
      </View>
      <FlatList
        data={falleros}
        keyExtractor={item => item.id}
        renderItem={renderFalleroItem}
        contentContainerStyle={styles.fallerosList}
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              {selectedUser && (
                <>
                  <Image
                    source={
                      selectedUser.profileImageUrl
                        ? { uri: selectedUser.profileImageUrl }
                        : require('../assets/images/default-avatar.png')
                    }
                    style={styles.modalAvatar}
                  />
                  <Text style={styles.modalUsername}>
                    {selectedUser.username}
                  </Text>
                  <Text style={styles.modalField}>
                    Nombre completo: {selectedUser.fullName}
                  </Text>
                  <Text style={styles.modalField}>
                    Email: {selectedUser.email}
                  </Text>
                  {selectedUser.phone && (
                    <Text style={styles.modalField}>
                      Teléfono: {selectedUser.phone}
                    </Text>
                  )}
                  {selectedUser.address && (
                    <Text style={styles.modalField}>
                      Dirección: {selectedUser.address}
                    </Text>
                  )}

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={confirmAndDelete}
                      disabled={processingDelete}
                    >
                      {processingDelete ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.deleteText}>
                          Eliminar Fallero
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  backButton: { marginRight: 12 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },

  section: { marginTop: 16, marginBottom: 8, paddingHorizontal: 16 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },

  solicitudesList: { paddingVertical: 4 },
  fallerosList: { paddingBottom: 20 },

  solicitudCard: { width: 80, marginRight: 12, backgroundColor: '#1f1f1f', borderRadius: 8, alignItems: 'center', padding: 8 },
  solicitudAvatar: { width: 48, height: 48, borderRadius: 24, marginBottom: 6 },
  solicitudName: { color: '#fff', fontSize: 12, textAlign: 'center' },
  solicitudActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 4 },

  falleroCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f1f1f', borderRadius: 8, padding: 12, marginHorizontal: 16, marginVertical: 6 },
  falleroAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  falleroInfo: { flex: 1 },
  username: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  fullName: { color: '#bbb', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxHeight: '80%', backgroundColor: '#1f1f1f', borderRadius: 12, padding: 16 },

  modalAvatar: { width: 80, height: 80, borderRadius: 40, alignSelf: 'center', marginBottom: 12 },
  modalUsername: { fontSize: 18, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 12 },
  modalField: { color: '#ccc', fontSize: 14, marginBottom: 8 },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 },
  cancelText: { color: '#fff', fontSize: 14 },
  deleteBtn: { backgroundColor: '#f44336', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  deleteText: { color: '#fff', fontSize: 14, fontWeight: 'bold' }
});
