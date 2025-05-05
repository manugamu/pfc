import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ImageBackground,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { getValidAccessToken, logoutUser } from '../services/authService';
import Evento from '../components/Eventos';
import { useBackground } from '../context/BackgroundContext';

export default function BusquedasScreen() {
  const navigation = useNavigation();
  const { setIsLoggedIn } = useContext(AuthContext);
  const { backgroundImage } = useBackground();

  const [events, setEvents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startDateFilter, setStartDateFilter] = useState(null);
  const [endDateFilter, setEndDateFilter] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setQuery('');
        setStartDateFilter(null);
        setEndDateFilter(null);
      };
    }, [])
  );

  useEffect(() => {
    const fetchEvents = async () => {
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
        setEvents(data);
        setFiltered(data);
      } catch (err) {
        console.error('Error cargando eventos:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [navigation, setIsLoggedIn]);

  useEffect(() => {
    let list = [...events];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.creatorName && e.creatorName.toLowerCase().includes(q))
      );
    }
    if (startDateFilter) list = list.filter(e => new Date(e.startDate) >= startDateFilter);
    if (endDateFilter) list = list.filter(e => new Date(e.endDate) <= endDateFilter);
    setFiltered(list);
  }, [query, startDateFilter, endDateFilter, events]);

  const handlePress = evento => {
    navigation.navigate('EventoChatScreen', {
      eventoId: evento.id,
      title: evento.title,
      location: evento.location,
      backgroundImage: evento.imageUrl,
      creatorName: evento.creatorName,
      creatorId: evento.creatorId
    });
  };

  const clearFilters = () => {
    setQuery('');
    setStartDateFilter(null);
    setEndDateFilter(null);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <ImageBackground source={backgroundImage} style={styles.background}>
      <View style={styles.overlay}>
        <View style={styles.toolbar}>
          <Text style={styles.toolbarTitle}>Búsqueda</Text>
        </View>

        <View style={styles.topRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar..."
            placeholderTextColor="#888"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearText}>Limpiar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.input} onPress={() => setShowStartPicker(true)}>
            <Text style={styles.inputText}>
              {startDateFilter ? startDateFilter.toLocaleDateString() : 'Desde'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.input} onPress={() => setShowEndPicker(true)}>
            <Text style={styles.inputText}>
              {endDateFilter ? endDateFilter.toLocaleDateString() : 'Hasta'}
            </Text>
          </TouchableOpacity>
        </View>

        {showStartPicker && (
          <DateTimePicker
            value={startDateFilter || new Date()}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowStartPicker(false);
              if (date) setStartDateFilter(date);
            }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={endDateFilter || new Date()}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowEndPicker(false);
              if (date) setEndDateFilter(date);
            }}
          />
        )}

        {filtered.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.noResults}>No se encontraron eventos</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handlePress(item)} activeOpacity={0.8}>
                <Evento {...item} backgroundImage={item.imageUrl} onPress={() => handlePress(item)} />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.23)', paddingTop: 20 },
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 20,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  toolbarTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8 },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 35,
    backgroundColor: '#2c2c2c',
    color: '#fff'
  },
  clearButton: {
    marginLeft: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fd882d',
    borderRadius: 12
  },
  clearText: { color: '#fff', fontWeight: 'bold' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 8 },
  input: {
    flex: 1,
    backgroundColor: '#2c2c2c',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4
  },
  inputText: { color: '#fff' },
  list: { paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noResults: { color: '#888', fontSize: 16 }
});
