import { Alert } from 'react-native';

export function isDateInPast(dateLike) {
  if (!dateLike) return false;
  const d = dateLike instanceof Date ? new Date(dateLike) : new Date(String(dateLike));
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

export function isDateTimeInPast(dateStr, timeStr) {
  if (!dateStr) return false;
  const time = timeStr && String(timeStr).trim() ? String(timeStr).trim() : '00:00';
  const d = new Date(`${dateStr}T${time.length === 5 ? `${time}:00` : time}`);
  return !Number.isNaN(d.getTime()) && d < new Date();
}

export function confirmPastActivityDate() {
  return new Promise((resolve) => {
    Alert.alert(
      'Past date selected',
      'This activity date is in the past. Do you want to continue?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ],
    );
  });
}

export function confirmPastTaskDate() {
  return new Promise((resolve) => {
    Alert.alert(
      'Past date selected',
      'This task date is in the past. Do you want to continue?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ],
    );
  });
}
