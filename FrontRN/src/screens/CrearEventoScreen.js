import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import EncryptedStorage from 'react-native-encrypted-storage';
import { useNavigation } from '@react-navigation/native';
import calles from '../assets/calles/llistat-dels-carrers.json';

export default function CrearEventoScreen({ route }) {
  const navigation = useNavigation();
  const setIsLoggedIn = route.params?.setIsLoggedIn;

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [creatorId, setCreatorId] = useState(null);
  const [creatorName, setCreatorName] = useState(null);
  const [filteredLocations, setFilteredLocations] = useState([]);

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await EncryptedStorage.getItem('auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          const token = parsed.accessToken;

          const res = await fetch('http://10.0.2.2:5000/api/users/me', {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok) {
            const userData = await res.json();
            setCreatorId(userData.id);
            setCreatorName(userData.username);
          } else {
            console.error('❌ Error al cargar info del usuario');
          }
        }
      } catch (err) {
        console.error('Error recuperando usuario:', err);
      }
    };
    loadUser();
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

  const handleSubmit = async () => {
    if (!title || !location || !description) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }

    const newEvent = {
      title,
      location,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      description,
      imageUrl: 'https://source.unsplash.com/random/800x600',
      creatorName,
      creatorId,
      createdAt: new Date().toISOString(),
    };

    try {
      const auth = await EncryptedStorage.getItem('auth');
      const token = JSON.parse(auth)?.accessToken;

      const response = await fetch('http://10.0.2.2:5000/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newEvent),
      });

      if (response.ok) {
        Alert.alert('✅ Evento creado correctamente');
        navigation.goBack();
      } else if (response.status === 401 || response.status === 403) {
        Alert.alert('Sesión expirada', 'Tu sesión ha caducado o el token fue revocado.');
        await EncryptedStorage.removeItem('auth');
        if (setIsLoggedIn) setIsLoggedIn(false);
      } else {
        Alert.alert('❌ Error', `Código: ${response.status}`);
      }
    } catch (error) {
      console.error('💥 Error:', error);
      Alert.alert('❌ Error de red o del servidor');
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
          onChangeText={setTitle}
          value={title}
        />

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
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => selectLocation(item)}
                >
                  <Text style={{ color: '#fff' }}>
                    {`${item.codtipovia} ${item.traducnooficial && item.traducnooficial.toLowerCase() !== 'null' ? item.traducnooficial + ' ' : ''}${item.nomoficial}, ${calles.Municipio}`}
                  </Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}

        <TouchableOpacity style={styles.input} onPress={() => setShowStartPicker(true)}>
          <Text style={{ color: '#fff' }}>
            Fecha de inicio: {startDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartPicker(false);
              if (selectedDate) setStartDate(selectedDate);
            }}
          />
        )}

        <TouchableOpacity style={styles.input} onPress={() => setShowEndPicker(true)}>
          <Text style={{ color: '#fff' }}>
            Fecha de fin: {endDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndPicker(false);
              if (selectedDate) setEndDate(selectedDate);
            }}
          />
        )}

        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          placeholder="Descripción"
          placeholderTextColor="#ccc"
          onChangeText={setDescription}
          value={description}
        />

        <Text style={{ color: '#ccc', textAlign: 'center', marginVertical: 8 }}>
          Usuario: {creatorName}
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Crear</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  inner: {
    padding: 16,
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2c2c2c',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#fd882d',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
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
});
