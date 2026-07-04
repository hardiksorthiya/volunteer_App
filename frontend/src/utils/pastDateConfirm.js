export function isDateInPast(ymd) {
  if (!ymd) return false;
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export function isDateTimeInPast(dateStr, timeStr) {
  if (!dateStr) return false;
  const time = timeStr && String(timeStr).trim() ? String(timeStr).trim() : '00:00';
  const d = new Date(`${dateStr}T${time.length === 5 ? `${time}:00` : time}`);
  return !Number.isNaN(d.getTime()) && d < new Date();
}

export function confirmPastActivityDate() {
  return window.confirm('This activity date is in the past. Do you want to continue?');
}

export function confirmPastTaskDate(startDate, dueDate) {
  if (isDateInPast(startDate) || isDateInPast(dueDate)) {
    return window.confirm('This task date is in the past. Do you want to continue?');
  }
  return true;
}
