import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert,
  FlatList, KeyboardAvoidingView, Platform, Image
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import EncryptedStorage from 'react-native-encrypted-storage';
import { useNavigation } from '@react-navigation/native';
import { getValidAccessToken, logoutUser } from '../services/authService';
import { AuthContext } from '../context/AuthContext';
import calles from '../assets/calles/llistat-dels-carrers.json';
import { launchImageLibrary } from 'react-native-image-picker';

export default function CrearEventoScreen() {
  const navigation = useNavigation();
  const { setIsLoggedIn } = useContext(AuthContext);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [creatorId, setCreatorId] = useState(null);
  const [creatorName, setCreatorName] = useState(null);
  const [creatorRole, setCreatorRole] = useState(null);
  const [filteredLocations, setFilteredLocations] = useState([]);

  const [imageUri, setImageUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [startDate, setStartDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);

  const [endDate, setEndDate] = useState(new Date());
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const stored = await EncryptedStorage.getItem('auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          setCreatorId(parsed.id);
          setCreatorName(parsed.username);
          setCreatorRole(parsed.role);
        }
      } catch (err) {
        console.error('Error obteniendo datos de usuario:', err);
      }
    };
    loadUserFromStorage();
  }, []);

  const handleLocationInput = (text) => {
    setLocation(text);
    if (text.length > 2) {
      const lowerText = text.toLowerCase();
      const filtered = calles.elementos.filter((c) =>
        (c.nomoficial && c.nomoficial.toLowerCase().includes(lowerText)) ||
        (c.traducnooficial &&
          c.traducnooficial.toLowerCase() !== 'null' &&
          c.traducnooficial.toLowerCase().includes(lowerText))
      );
      setFilteredLocations(filtered.slice(0, 10));
    } else {
      setFilteredLocations([]);
    }
  };

  const selectLocation = (item) => {
    const traduc = item.traducnooficial && item.traducnooficial.toLowerCase() !== 'null'
      ? `${item.traducnooficial} `
      : '';
    const nombre = `${item.codtipovia} ${traduc}${item.nomoficial}, ${calles.Municipio}`;
    setLocation(nombre);
    setFilteredLocations([]);
  };

  const selectImage = () => {
    launchImageLibrary({ mediaType: 'photo' }, async (response) => {
      if (response.didCancel || !response.assets?.length) return;
      const asset = response.assets[0];
      setImageUri(asset.uri);
    });
  };

  const uploadToBackend = async (uri) => {
    const token = await getValidAccessToken(navigation, setIsLoggedIn);
    if (!token) return null;

    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: 'evento.jpg',
    });

    const res = await fetch('http://10.0.2.2:5000/api/images/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    if (!res.ok) throw new Error('Error subiendo imagen');
    return await res.text();
  };

  const handleSubmit = async () => {
    if (!title || !location || !description) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }
    if (endDate < startDate) {
      Alert.alert('Error', 'La fecha y hora de fin debe ser posterior a la de inicio');
      return;
    }
    if (!imageUri) {
      Alert.alert('Falta imagen', 'Debes seleccionar una imagen para el evento');
      return;
    }

    try {
      setUploading(true);
      const imageUrl = await uploadToBackend(imageUri);
      if (!imageUrl) {
        Alert.alert('Error', 'No se pudo subir la imagen');
        return;
      }

      const token = await getValidAccessToken(navigation, setIsLoggedIn);
      if (!token) return;

      const newEvent = {
        title,
        location,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        description,
        imageUrl,
        creatorName,
        creatorId,
        creatorRole,
        createdAt: new Date().toISOString(),
      };

      const response = await fetch('http://10.0.2.2:5000/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newEvent),
      });

      if (response.ok) {
        Alert.alert('Evento creado correctamente');
        navigation.goBack();
      } else if (response.status === 401 || response.status === 403) {
        await logoutUser(navigation, setIsLoggedIn);
      } else {
        Alert.alert('Error', `Código: ${response.status}`);
      }
    } catch (error) {
      console.error('Error al crear evento:', error);
      Alert.alert('Error al crear evento');
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Crear Evento</Text>

        <TextInput
          style={styles.input}
          placeholder="Título"
          placeholderTextColor="#ccc"
          onChangeText={(text) => {
            if (text.length <= 30) setTitle(text);
          }}
          value={title}
        />
        <Text style={styles.charCount}>
          {title.length} / 30 caracteres
        </Text>


        <TextInput
          style={styles.input}
          placeholder="Ubicación"
          placeholderTextColor="#ccc"
          onChangeText={handleLocationInput}
          value={location}
        />

        {filteredLocations.length > 0 && (
          <View style={styles.suggestionBox}>
            <FlatList
              data={filteredLocations}
              keyExtractor={(item, index) => `${item.codvia}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.suggestionItem} onPress={() => selectLocation(item)}>
                  <Text style={{ color: '#fff' }}>
                    {`${item.codtipovia} ${item.traducnooficial && item.traducnooficial.toLowerCase() !== 'null'
                      ? item.traducnooficial + ' '
                      : ''}${item.nomoficial}, ${calles.Municipio}`}
                  </Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}

        <TouchableOpacity style={styles.imageButton} onPress={selectImage}>
          <Text style={styles.imageButtonText}>{imageUri ? 'Cambiar Imagen' : 'Seleccionar Imagen'}</Text>
        </TouchableOpacity>

        {imageUri && <Image source={{ uri: imageUri }} style={styles.previewImage} />}

        <View style={styles.dateTimeRow}>
          <TouchableOpacity style={[styles.input, styles.flexItem]} onPress={() => setShowStartTimePicker(true)}>
            <Text style={styles.dtText}>
              {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.input, styles.flexItem]} onPress={() => setShowStartDatePicker(true)}>
            <Text style={styles.dtText}>{startDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
        </View>

        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(e, date) => {
              setShowStartDatePicker(false);
              if (date) {
                setStartDate(prev => new Date(date.setHours(prev.getHours(), prev.getMinutes())));
              }
            }}
          />
        )}
        {showStartTimePicker && (
          <DateTimePicker
            value={startDate}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={(e, time) => {
              setShowStartTimePicker(false);
              if (time) {
                setStartDate(prev => new Date(prev.setHours(time.getHours(), time.getMinutes())));
              }
            }}
          />
        )}

        <View style={styles.dateTimeRow}>
          <TouchableOpacity style={[styles.input, styles.flexItem]} onPress={() => setShowEndTimePicker(true)}>
            <Text style={styles.dtText}>
              {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.input, styles.flexItem]} onPress={() => setShowEndDatePicker(true)}>
            <Text style={styles.dtText}>{endDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
        </View>

        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            minimumDate={startDate}
            onChange={(e, date) => {
              setShowEndDatePicker(false);
              if (date) {
                setEndDate(prev => new Date(date.setHours(prev.getHours(), prev.getMinutes())));
              }
            }}
          />
        )}
        {showEndTimePicker && (
          <DateTimePicker
            value={endDate}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={(e, time) => {
              setShowEndTimePicker(false);
              if (time) {
                setEndDate(prev => new Date(prev.setHours(time.getHours(), time.getMinutes())));
              }
            }}
          />
        )}

        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          placeholder="Descripción (máx. 150 caracteres)"
          placeholderTextColor="#ccc"
          onChangeText={(text) => {
            if (text.length <= 150) setDescription(text);
          }}
          value={description}
        />
        <Text style={styles.charCount}>
          {description.length} / 150 caracteres
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={uploading}>
          <Text style={styles.buttonText}>{uploading ? 'Creando...' : 'Crear'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  inner: { padding: 16, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 16, textAlign: 'center' },
  input: {
    backgroundColor: '#2c2c2c',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  charCount: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 8,
    marginTop: -8,
  },
  button: {
    backgroundColor: '#fd882d',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  suggestionBox: {
    maxHeight: 200,
    backgroundColor: '#1e1e1e',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flexItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  dtText: {
    color: '#fff',
    textAlign: 'center',
  },
  imageButton: {
    backgroundColor: '#444',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  imageButtonText: { color: '#fff' },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
});
