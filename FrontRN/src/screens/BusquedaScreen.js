import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ImageBackground,
  Modal,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { getValidAccessToken, logoutUser } from '../services/authService';
import Evento from '../components/Eventos';
import { useBackground } from '../context/BackgroundContext';
import EncryptedStorage from 'react-native-encrypted-storage';

export default function BusquedasScreen() {
  const navigation = useNavigation();
  const { setIsLoggedIn } = useContext(AuthContext);
  const { backgroundImage } = useBackground();

  const [events, setEvents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [miId, setMiId] = useState(null);

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [markedDates, setMarkedDates] = useState({});

  const fetchEvents = useCallback(async () => {
    try {
      const auth = await EncryptedStorage.getItem('auth');
      if (auth) {
        const parsed = JSON.parse(auth);
        setMiId(parsed.id);
      }
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
    } catch (err) {
      console.error('Error cargando eventos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation, setIsLoggedIn]);

  useFocusEffect(
    useCallback(() => {
      setRefreshing(true);
      fetchEvents();
    }, [fetchEvents])
  );

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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
    if (startDateFilter) list = list.filter(e => moment(e.startDate).isSameOrAfter(startDateFilter));
    if (endDateFilter) list = list.filter(e => moment(e.endDate).isSameOrBefore(endDateFilter));
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
    setStartDateFilter('');
    setEndDateFilter('');
    setMarkedDates({});
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
          <TouchableOpacity style={styles.input} onPress={() => setCalendarVisible(true)}>
            <Text style={styles.inputText}>
              {startDateFilter && endDateFilter
                ? `Del ${moment(startDateFilter).format('DD/MM/YYYY')} al ${moment(endDateFilter).format('DD/MM/YYYY')}`
                : 'Filtrar por rango de fechas'}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchEvents();
              }}
              colors={['#fd882d']}
              tintColor="#fd882d"
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.center}>
              <Text style={styles.noResults}>No se encontraron eventos</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={{ width: '100%', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: '100%' }}>
                <Evento
                  {...item}
                  backgroundImage={item.imageUrl}
                  onPress={() => handlePress(item)}
                  miId={miId}
                  refreshEventos={fetchEvents}
                />
              </View>
            </View>
          )}
        />
      </View>

      <Modal visible={calendarVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#121212', padding: 16 }}>
          <Calendar
            markingType={'period'}
            markedDates={markedDates}
            onDayPress={(date) => {
              let selected = moment(date.dateString);
              if (!startDateFilter || (startDateFilter && endDateFilter)) {
                setStartDateFilter(selected.format('YYYY-MM-DD'));
                setEndDateFilter('');
                setMarkedDates({
                  [selected.format('YYYY-MM-DD')]: {
                    startingDay: true,
                    color: '#fd882d',
                    textColor: 'white'
                  }
                });
              } else {
                const start = moment(startDateFilter);
                if (selected.isBefore(start)) {
                  setStartDateFilter(selected.format('YYYY-MM-DD'));
                  setMarkedDates({
                    [selected.format('YYYY-MM-DD')]: {
                      startingDay: true,
                      color: '#fd882d',
                      textColor: 'white'
                    }
                  });
                } else {
                  setEndDateFilter(selected.format('YYYY-MM-DD'));
                  let range = {};
                  for (let m = start; m.isSameOrBefore(selected); m.add(1, 'days')) {
                    const key = m.format('YYYY-MM-DD');
                    range[key] = {
                      color: '#fd882d',
                      textColor: 'white',
                      ...(key === start.format('YYYY-MM-DD') && { startingDay: true }),
                      ...(key === selected.format('YYYY-MM-DD') && { endingDay: true })
                    };
                  }
                  setMarkedDates(range);
                }
              }
            }}
            minDate={moment().subtract(1, 'year').format('YYYY-MM-DD')}
            maxDate={moment().add(1, 'year').format('YYYY-MM-DD')}
            theme={{
              calendarBackground: '#121212',
              dayTextColor: '#fff',
              monthTextColor: '#fd882d',
              selectedDayBackgroundColor: '#fd882d',
              selectedDayTextColor: '#fff',
              todayTextColor: '#fd882d'
            }}
          />
          <TouchableOpacity onPress={() => setCalendarVisible(false)} style={[styles.clearButton, { marginTop: 20 }]}>
            <Text style={styles.clearText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.23)', paddingTop: 20 },
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
  inputText: { color: '#fff', textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noResults: { color: '#888', fontSize: 16 }
});
