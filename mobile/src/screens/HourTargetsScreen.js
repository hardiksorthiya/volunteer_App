import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';
import Header from '../components/Header';
import { ClockIcon } from '../components/Icons';

const toYMD = (dateObj) => {
  if (!dateObj) return null;
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const extractYMD = (value) => {
  if (!value) return '';
  const s = String(value);
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : s;
};

const formatDMY = (value) => {
  const ymd = extractYMD(value);
  const parts = ymd.split('-'); // [yyyy, mm, dd]
  if (parts.length !== 3) return ymd;
  const [yyyy, mm, dd] = parts;
  return `${dd}-${mm}-${yyyy}`;
};

const HourTargetsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [hourTargetProgress, setHourTargetProgress] = useState(null);
  const [history, setHistory] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editRowId, setEditRowId] = useState(null);

  const [formHours, setFormHours] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deletingRowId, setDeletingRowId] = useState(null);
  const [clearingActive, setClearingActive] = useState(false);

  const load = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Session expired', 'Please login again.');
        return;
      }

      setLoading(true);

      const [meRes, progressRes, historyRes] = await Promise.all([
        api.get('/users/me'),
        api.get('/users/me/hour-target-progress'),
        api.get('/users/me/hour-targets'),
      ]);

      if (meRes.data?.success) setUser(meRes.data.data);
      if (progressRes.data?.success) setHourTargetProgress(progressRes.data.data);
      setHistory(historyRes.data?.success ? historyRes.data.data || [] : []);
    } catch (e) {
      console.error('HourTargetsScreen load error:', e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to load hour targets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setModalMode('add');
    setEditRowId(null);

    const sd = hourTargetProgress?.target_start_date;
    const ed = hourTargetProgress?.target_end_date;
    const start = sd ? new Date(`${sd}T00:00:00`) : new Date();
    const end = ed ? new Date(`${ed}T00:00:00`) : new Date();

    setStartDate(start);
    setEndDate(end);
    setFormHours(
      hourTargetProgress?.target_hours != null ? String(hourTargetProgress.target_hours) : ''
    );
    setShowModal(true);
  };

  const openEdit = (row) => {
    setModalMode('edit');
    setEditRowId(row.id);

    const start = row.start_date ? new Date(`${extractYMD(row.start_date)}T00:00:00`) : new Date();
    const end = row.end_date ? new Date(`${extractYMD(row.end_date)}T00:00:00`) : new Date();

    setStartDate(start);
    setEndDate(end);
    setFormHours(row.target_hours != null ? String(row.target_hours) : '');
    setShowModal(true);
  };

  const handleSave = async () => {
    const hoursNum = formHours === '' ? null : parseInt(formHours, 10);
    if (hoursNum === null || Number.isNaN(hoursNum) || hoursNum < 0) {
      Alert.alert('Error', 'Please enter a valid non-negative number of hours.');
      return;
    }

    if (!startDate || !endDate) {
      Alert.alert('Error', 'Please select a start date and end date.');
      return;
    }

    if (startDate.getTime() > endDate.getTime()) {
      Alert.alert('Error', 'Start date must be before or equal to end date.');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'add') {
        await api.put('/users/me', {
          hour_target_start_date: toYMD(startDate),
          hour_target_end_date: toYMD(endDate),
          hour_target_hours: hoursNum,
        });
      } else {
        await api.put(`/users/me/hour-targets/${editRowId}`, {
          hour_target_start_date: toYMD(startDate),
          hour_target_end_date: toYMD(endDate),
          hour_target_hours: hoursNum,
        });
      }

      setShowModal(false);
      await load();
    } catch (e) {
      console.error('HourTargetsScreen save error:', e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to save hour target.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearActive = async () => {
    Alert.alert('Confirm', 'Clear the active hour target?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          setClearingActive(true);
          try {
            await api.delete('/users/me/hour-target');
            await load();
          } catch (e) {
            console.error('Clear active error:', e);
            Alert.alert('Error', e.response?.data?.message || 'Failed to clear target.');
          } finally {
            setClearingActive(false);
          }
        },
      },
    ]);
  };

  const handleDeleteRow = (id) => {
    Alert.alert('Confirm', 'Delete this hour target record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingRowId(id);
          try {
            await api.delete(`/users/me/hour-targets/${id}`);
            await load();
          } catch (e) {
            console.error('Delete row error:', e);
            Alert.alert('Error', e.response?.data?.message || 'Failed to delete target.');
          } finally {
            setDeletingRowId(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const currentHours = hourTargetProgress?.target_hours ?? null;
  const currentStart = hourTargetProgress?.target_start_date ?? null;
  const currentEnd = hourTargetProgress?.target_end_date ?? null;
  const currentDone = hourTargetProgress?.current_range_hours ?? 0;

  const pct =
    currentHours != null && Number(currentHours) > 0
      ? Math.min(100, Math.round((Number(currentDone) / Number(currentHours)) * 100))
      : 0;

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <View style={styles.iconWrap}>
            <ClockIcon size={20} color="#2563eb" />
          </View>
          <Text style={styles.sectionTitle}>Hourly Target</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Current target</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={openAdd}>
              <Text style={styles.primaryButtonText}>Set / Add</Text>
            </TouchableOpacity>
          </View>

          {currentHours != null && currentStart && currentEnd ? (
            <>
              <Text style={styles.rangeText}>
                {formatDMY(currentStart)} - {formatDMY(currentEnd)}
              </Text>
              <Text style={styles.hoursText}>
                {currentDone} / {currentHours} hours
              </Text>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>

              <TouchableOpacity
                style={[styles.dangerButton, clearingActive && { opacity: 0.7 }]}
                onPress={handleClearActive}
                disabled={clearingActive}
              >
                <Text style={styles.dangerButtonText}>{clearingActive ? 'Clearing…' : 'Clear active'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.mutedText}>No target set.</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Target history</Text>
            <Text style={styles.mutedSmall}>{history.length} record(s)</Text>
          </View>

          {history.length === 0 ? (
            <Text style={styles.mutedText}>No history yet.</Text>
          ) : (
            history.map((row) => (
              <View key={row.id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyRange}>
                    {row.start_date && row.end_date
                      ? `${formatDMY(row.start_date)} - ${formatDMY(row.end_date)}`
                      : formatDMY(row.created_at)}
                  </Text>
                  <Text style={styles.historyHours}>{row.target_hours} hours</Text>
                  <Text style={styles.mutedTiny}>Created: {formatDMY(row.created_at)}</Text>
                </View>

                <View style={styles.rowActions}>
                  <TouchableOpacity style={styles.outlineButton} onPress={() => openEdit(row)}>
                    <Text style={styles.outlineButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dangerSmallButton, deletingRowId === row.id && { opacity: 0.7 }]}
                    onPress={() => handleDeleteRow(row.id)}
                    disabled={deletingRowId === row.id}
                  >
                    <Text style={styles.dangerSmallButtonText}>{deletingRowId === row.id ? 'Deleting…' : 'Delete'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Modal: add/edit */}
        <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {modalMode === 'add' ? 'Set hour target' : 'Edit hour target'}
              </Text>

              <Text style={styles.inputLabel}>Start date</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
                <Text style={styles.dateButtonText}>
                  {startDate ? formatDMY(toYMD(startDate)) : 'Select start date'}
                </Text>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowStartPicker(false);
                    if (date) setStartDate(date);
                  }}
                />
              )}

              <Text style={styles.inputLabel}>End date</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
                <Text style={styles.dateButtonText}>
                  {endDate ? formatDMY(toYMD(endDate)) : 'Select end date'}
                </Text>
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowEndPicker(false);
                    if (date) setEndDate(date);
                  }}
                />
              )}

              <Text style={styles.inputLabel}>Target hours</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 10"
                keyboardType="number-pad"
                value={formHours}
                onChangeText={setFormHours}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)} disabled={saving}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                  <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  iconWrap: { backgroundColor: '#eff6ff', borderRadius: 999, padding: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  mutedText: { marginTop: 8, color: '#6b7280' },
  mutedSmall: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  mutedTiny: { color: '#9ca3af', fontSize: 11, marginTop: 4 },
  primaryButton: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  dangerButton: { marginTop: 12, backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  dangerButtonText: { color: '#fff', fontWeight: '700' },
  rangeText: { marginTop: 10, color: '#111827', fontWeight: '700' },
  hoursText: { marginTop: 6, color: '#374151' },
  progressBg: { marginTop: 12, height: 10, borderRadius: 999, backgroundColor: '#e5e7eb', overflow: 'hidden' },
  progressFill: { height: 10, backgroundColor: '#10b981', borderRadius: 999 },
  historyRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  historyRange: { fontWeight: '700', color: '#111827' },
  historyHours: { marginTop: 4, color: '#374151' },
  rowActions: { width: 150, justifyContent: 'space-between' },
  outlineButton: { borderWidth: 1, borderColor: '#2563eb', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#fff' },
  outlineButtonText: { color: '#2563eb', fontWeight: '700', textAlign: 'center' },
  dangerSmallButton: { backgroundColor: '#ef4444', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, marginTop: 8 },
  dangerSmallButtonText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 18, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 10 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 10, marginBottom: 6 },
  dateButton: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12 },
  dateButtonText: { color: '#111827', fontWeight: '600' },
  modalInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, marginTop: 6 },
  modalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 18 },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  cancelButtonText: { color: '#6b7280', fontWeight: '800' },
  saveButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#2563eb' },
  saveButtonText: { color: '#fff', fontWeight: '800' },
});

export default HourTargetsScreen;

