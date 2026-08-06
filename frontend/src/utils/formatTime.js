// Formats a 24-hour "HH:MM" string (what the wizard/backend store for trip start
// and end times) into a 12-hour "h:MM AM/PM" label for display. Blank input ⇒ ''.
// Shared so the wizard's time picker and the summary card render times the same
// way. Input is a plain wall-clock string, not a Date/ISO instant.
export function formatTime12h(value) {
  if (!value) return '';
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}
