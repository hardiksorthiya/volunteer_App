/** localStorage key scoped to the logged-in user so chat history is not shared across accounts. */
export function getChatConversationsStorageKey() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (user?.id == null || user.id === '') return null;
    return `chatConversations_${user.id}`;
  } catch {
    return null;
  }
}
