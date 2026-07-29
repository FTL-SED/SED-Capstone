import './PinTiming.css'
import { useState } from 'react'

const TZ = 'America/Los_Angeles';

// Stops are stored as ISO instants but shown in Pacific wall-clock. Display the
// HH:MM in that zone (12h, matching the rest of the timeline).
function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  });
}

// Seed an <input type="time"> (which wants 24h "HH:MM") from an ISO instant,
// read in Pacific wall-clock so the field matches what the timeline shows.
function toTimeInputValue(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TZ,
  });
}

// How many minutes LA is ahead of UTC at a given instant (positive number for
// LA's negative offset — e.g. PDT ⇒ 420). Uses the round-trip localize trick so
// it tracks PST/PDT automatically without a date library.
function laOffsetMinutes(instant) {
  const asUTC = new Date(instant.toLocaleString('en-US', { timeZone: 'UTC' }));
  const asLA = new Date(instant.toLocaleString('en-US', { timeZone: TZ }));
  return (asUTC - asLA) / 60000;
}

// Combine the stop's existing LA calendar date with an edited "HH:MM" (LA
// wall-clock) into a new ISO instant, so editing the time never shifts the day.
function laWallClockToISO(baseIso, timeStr) {
  const [y, mo, d] = new Date(baseIso)
    .toLocaleDateString('en-CA', { timeZone: TZ }) // "YYYY-MM-DD"
    .split('-')
    .map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  // Treat the wall clock as UTC, then correct by LA's offset at that instant.
  const asUTC = Date.UTC(y, mo - 1, d, h, mi);
  const offset = laOffsetMinutes(new Date(asUTC));
  return new Date(asUTC + offset * 60000).toISOString();
}

// A stop's timing. Read-only by default; when `editable`, a pencil reveals two
// time inputs (start/end) with save/cancel — the same inline pattern as the
// remove control. Only the ItineraryStop's start/end change; the venue is never
// touched. `startTime`/`endTime` are raw ISO instants.
// `controlProps` (owner mode) is spread onto every interactive control so a
// click/keypress here stops propagating to the draggable card and never starts
// a drag. Undefined for the read-only viewer path.
function PinTiming({ startTime, endTime, editable = false, stopId, onEditStop, siblings = [], controlProps }) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');

  const beginEdit = () => {
    setStart(toTimeInputValue(startTime));
    setEnd(toTimeInputValue(endTime));
    setError('');
    setEditing(true);
  };

  const save = () => {
    if (!start || !end) {
      setError('Both times are required.');
      return;
    }
    const newStart = laWallClockToISO(startTime, start);
    const newEnd = laWallClockToISO(endTime, end);
    if (new Date(newEnd) <= new Date(newStart)) {
      setError('End time must be after start time.');
      return;
    }
    const overlaps = siblings.some((s) => {
      // Half-open overlap on absolute instants: touching boundaries are OK.
      const a0 = new Date(newStart).getTime();
      const a1 = new Date(newEnd).getTime();
      const b0 = new Date(s.startTime).getTime();
      const b1 = new Date(s.endTime).getTime();
      return a0 < b1 && a1 > b0;
    });
    if (overlaps) {
      setError('This time overlaps another stop.');
      return;
    }
    setEditing(false);
    onEditStop(stopId, { startTime: newStart, endTime: newEnd });
  };

  if (editable && editing) {
    return (
      <div className="pin-timing pin-timing--editing">
        <div className="pin-timing__inputs">
          <input
            type="time"
            className="pin-timing__input"
            aria-label="Start time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            {...controlProps}
          />
          <span aria-hidden="true">–</span>
          <input
            type="time"
            className="pin-timing__input"
            aria-label="End time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            {...controlProps}
          />
          <button type="button" className="pin-timing__save" onClick={save} {...controlProps}>
            Save
          </button>
          <button type="button" className="pin-timing__cancel" onClick={() => setEditing(false)} {...controlProps}>
            Cancel
          </button>
        </div>
        {error && <span className="pin-timing__error">{error}</span>}
      </div>
    );
  }

  return (
    <p className="pin-timing">
      {formatTime(startTime)} - {formatTime(endTime)}
      {editable && stopId != null && (
        <button
          type="button"
          className="pin-timing__edit"
          aria-label="Edit time"
          onClick={beginEdit}
          {...controlProps}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
      )}
    </p>
  );
}

export default PinTiming;
