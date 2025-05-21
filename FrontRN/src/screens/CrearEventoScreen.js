import React, { useState, useEffect, useContext } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Image,
  Modal,
  ScrollView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import Toast from 'react-native-toast-message';

import { API_BASE_URL } from '../config';
import { AuthContext } from '../context/AuthContext';
import { getValidAccessToken } from '../services/authService';
import calles from '../assets/calles/llistat-dels-carrers.json';

export default function CrearEventoScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { setIsLoggedIn } = useContext(AuthContext);
  const isEditMode = Boolean(route.params?.event);
  const event = route.params?.event;

  const [title, setTitle] = useState(event?.title || '');
  const [location, setLocation] = useState(event?.location || '');
  const [description, setDescription] = useState(event?.description || '');
  const [creatorId, setCreatorId] = useState(null);
  const [creatorName, setCreatorName] = useState(null);
  const [creatorRole, setCreatorRole] = useState(null);

  const [filteredLocations, setFilteredLocations] = useState([]);
  const [imageUri, setImageUri] = useState(event?.imageUrl || null);
  const [uploading, setUploading] = useState(false);

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [startDate, setStartDate] = useState(event?.startDate?.slice(0, 10) || '');
  const [endDate, setEndDate] = useState(event?.endDate?.slice(0, 10) || '');
  const [markedDates, setMarkedDates] = useState({});

  const [startTime, setStartTime] = useState(event?.startDate ? new Date(event.startDate) : new Date());
  const [endTime, setEndTime] = useState(event?.endDate ? new Date(event.endDate) : new Date());
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getValidAccessToken(navigation, setIsLoggedIn);
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setCreatorId(data.id);
      setCreatorName(data.username);
      setCreatorRole(data.role);
    })();
  }, []);

  const handleLocationInput = text => {
    setLocation(text);
    if (text.length > 2) {
      const lower = text.toLowerCase();
      const filtered = calles.elementos.filter(c =>
        (c.nomoficial?.toLowerCase().includes(lower)) ||
        (c.traducnooficial && c.traducnooficial.toLowerCase() !== 'null' && c.traducnooficial.toLowerCase().includes(lower))
      );
      setFilteredLocations(filtered.slice(0, 10));
    } else {
      setFilteredLocations([]);
    }
  };

  const selectLocation = item => {
    const trad = (item.traducnooficial && item.traducnooficial.toLowerCase() !== 'null')
      ? item.traducnooficial + ' ' : '';
    const nombre = `${item.codtipovia} ${trad}${item.nomoficial}, ${calles.Municipio}`;
    setLocation(nombre);
    setFilteredLocations([]);
  };

  const selectImage = () => {
    launchImageLibrary({ mediaType: 'photo' }, response => {
      if (!response.didCancel && response.assets?.length) {
        setImageUri(response.assets[0].uri);
      }
    });
  };

  const uploadToBackend = async uri => {
    const token = await getValidAccessToken(navigation, setIsLoggedIn);
    if (!token) return null;
    const form = new FormData();
    form.append('file', { uri, type: 'image/jpeg', name: 'evento.jpg' });
    const res = await fetch(`${API_BASE_URL}/api/images/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      },
      body: form
    });
    if (!res.ok) throw new Error('Error subiendo imagen');
    return await res.text();
  };

  const handleSubmit = async () => {
    if (!title || !location || !description || !startDate || !endDate) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Todos los campos son obligatorios' });
      return;
    }
    const start = moment(`${startDate} ${moment(startTime).format('HH:mm')}`);
    const end = moment(`${endDate} ${moment(endTime).format('HH:mm')}`);
    if (end.isBefore(start)) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'La hora de fin debe ser posterior a la de inicio' });
      return;
    }
    try {
      setUploading(true);
      let imageUrl = imageUri;
      if (imageUri && !imageUri.startsWith('http')) {
        imageUrl = await uploadToBackend(imageUri);
      }
      const payload = {
        title,
        location,
        description,
        imageUrl,
        creatorId,
        creatorName,
        creatorRole,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        createdAt: isEditMode ? event.createdAt : new Date().toISOString()
      };
      const endpoint = isEditMode
        ? `${API_BASE_URL}/api/events/${event.id}`
        : `${API_BASE_URL}/api/events`;
      const method = isEditMode ? 'PUT' : 'POST';
      const token = await getValidAccessToken(navigation, setIsLoggedIn);
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`Código: ${res.status}`);
      Toast.show({
        type: 'success',
        text1: isEditMode ? 'Evento actualizado' : 'Evento creado'
      });
      navigation.goBack();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message || 'Error al guardar evento' });
    } finally {
      setUploading(false);
    }
  };

  const handleDateSelect = date => {
    const sel = moment(date.dateString);
    if (!startDate || (startDate && endDate)) {
      setStartDate(sel.format('YYYY-MM-DD'));
      setEndDate('');
      setMarkedDates({
        [sel.format('YYYY-MM-DD')]: { startingDay: true, color: '#fd882d', textColor: 'white' }
      });
    } else {
      const start = moment(startDate);
      if (sel.isBefore(start)) {
        setStartDate(sel.format('YYYY-MM-DD'));
        setMarkedDates({
          [sel.format('YYYY-MM-DD')]: { startingDay: true, color: '#fd882d', textColor: 'white' }
        });
      } else {
        setEndDate(sel.format('YYYY-MM-DD'));
        const range = {};
        for (let m = start.clone(); m.isSameOrBefore(sel); m.add(1, 'days')) {
          const key = m.format('YYYY-MM-DD');
          range[key] = {
            color: '#fd882d',
            textColor: 'white',
            ...(key === start.format('YYYY-MM-DD') && { startingDay: true }),
            ...(key === sel.format('YYYY-MM-DD') && { endingDay: true })
          };
        }
        setMarkedDates(range);
      }
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Editar Evento' : 'Crear Evento'}
          </Text>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.inner}
            keyboardShouldPersistTaps="never"
            keyboardDismissMode="on-drag"
            style={styles.flex}
          >
            <TextInput
              style={styles.input}
              placeholder="Título"
              placeholderTextColor="#ccc"
              value={title}
              onChangeText={t => t.length <= 30 && setTitle(t)}
            />
            <Text style={styles.charCount}>{title.length} / 30</Text>

            <TextInput
              style={styles.input}
              placeholder="Ubicación"
              placeholderTextColor="#ccc"
              value={location}
              onChangeText={handleLocationInput}
            />
            {filteredLocations.length > 0 && (
              <View style={styles.suggestionBox}>
                {filteredLocations.map((it, i) => (
                  <TouchableOpacity
                    key={`${it.codvia}-${i}`}
                    style={styles.suggestionItem}
                    onPress={() => selectLocation(it)}
                  >
                    <Text style={styles.suggestionText}>
                      {`${it.codtipovia} ${
                        it.traducnooficial !== 'null' ? it.traducnooficial + ' ' : ''
                      }${it.nomoficial}, ${calles.Municipio}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.iconButton} onPress={selectImage}>
              <View style={styles.iconContent}>
                <Ionicons name="image-outline" size={20} color="#fff" />
                <Text style={styles.iconText}>
                  {imageUri ? 'Cambiar Imagen' : 'Seleccionar Imagen'}
                </Text>
              </View>
            </TouchableOpacity>
            {imageUri && <Image source={{ uri: imageUri }} style={styles.previewImage} />}

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setCalendarVisible(true)}
            >
              <View style={styles.iconContent}>
                <Ionicons name="calendar-outline" size={20} color="#fff" />
                <Text style={styles.iconText}>
                  {startDate && endDate
                    ? `Del ${moment(startDate).format('DD/MM/YYYY')} al ${moment(endDate).format('DD/MM/YYYY')}`
                    : 'Seleccionar fechas'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={[styles.iconButton, styles.flexItem]}
                onPress={() => setShowStartTimePicker(true)}
              >
                <View style={styles.iconContent}>
                  <Ionicons name="time-outline" size={20} color="#fff" />
                  <Text style={styles.iconText}>
                    Hora inicio: {moment(startTime).format('HH:mm')}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, styles.flexItem]}
                onPress={() => setShowEndTimePicker(true)}
              >
                <View style={styles.iconContent}>
                  <Ionicons name="time-outline" size={20} color="#fff" />
                  <Text style={styles.iconText}>
                    Hora fin: {moment(endTime).format('HH:mm')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descripción (máx. 150 caracteres)"
              placeholderTextColor="#ccc"
              multiline
              value={description}
              onChangeText={t => t.length <= 150 && setDescription(t)}
            />
            <Text style={styles.charCount}>{description.length} / 150</Text>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={uploading}
            >
              <Text style={styles.buttonText}>
                {uploading
                  ? isEditMode
                    ? 'Actualizando...'
                    : 'Creando...'
                  : isEditMode
                  ? 'Actualizar'
                  : 'Crear'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        <Modal visible={calendarVisible} animationType="slide">
          <View style={styles.calendarContainer}>
            <Calendar
              markingType="period"
              markedDates={markedDates}
              onDayPress={handleDateSelect}
              minDate={moment().format('YYYY-MM-DD')}
              theme={{
                calendarBackground: '#121212',
                dayTextColor: '#fff',
                monthTextColor: '#fd882d',
                selectedDayBackgroundColor: '#fd882d',
                selectedDayTextColor: '#fff',
                todayTextColor: '#fd882d'
              }}
            />
            <TouchableOpacity
              onPress={() => setCalendarVisible(false)}
              style={[styles.button, { marginTop: 12 }]}
            >
              <Text style={styles.buttonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {showStartTimePicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            is24Hour
            display="spinner"
            onChange={(e, sel) => {
              setShowStartTimePicker(false);
              if (sel) setStartTime(sel);
            }}
          />
        )}
        {showEndTimePicker && (
          <DateTimePicker
            value={endTime}
            mode="time"
            is24Hour
            display="spinner"
            onChange={(e, sel) => {
              setShowEndTimePicker(false);
              if (sel) setEndTime(sel);
            }}
          />
        )}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  backButton: { marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  flex: { flex: 1 },
  inner: { flexGrow: 1, padding: 16, paddingBottom: 80 },
  input: {
    backgroundColor: '#2c2c2c',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  charCount: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 8,
    marginTop: -8
  },
  iconButton: {
    backgroundColor: '#2c2c2c',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  iconText: { color: '#fff', marginLeft: 8, textAlign: 'center' },
  button: {
    backgroundColor: '#fd882d',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  suggestionBox: {
    backgroundColor: '#1e1e1e',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden'
  },
  suggestionItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#444' },
  suggestionText: { color: '#fff' },
  previewImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 12 },
  dateTimeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  flexItem: { flex: 1, marginHorizontal: 4 },
  calendarContainer: { flex: 1, backgroundColor: '#121212', padding: 16 }
});
