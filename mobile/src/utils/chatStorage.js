import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getCurrentUserId() {
  try {
    const raw = await AsyncStorage.getItem('user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/** AsyncStorage key scoped to the logged-in user so chat history is not shared across accounts. */
export function chatConversationsKey(userId) {
  if (userId == null || userId === '') return null;
  return `chatConversations_${userId}`;
}

export function chatLocationDismissedKey(userId) {
  if (userId == null || userId === '') return 'chatLocationDismissed';
  return `chatLocationDismissed_${userId}`;
}
