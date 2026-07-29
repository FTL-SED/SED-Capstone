import './DateField.css'
import { useState, useRef, useEffect } from 'react'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Parse a "YYYY-MM-DD" value into a LOCAL date (avoids the UTC shift that
// `new Date("2025-07-26")` introduces in negative-offset timezones).
function parseLocal(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Local date → "YYYY-MM-DD", the string the backend expects for `tripDate`.
function toValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// A readable summary for the collapsed trigger, e.g. "Sat, Jul 26".
function formatSummary(date) {
  if (!date) return '';
  return date.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

// Today at local midnight — the earliest selectable day. Dates before this are
// disabled since a trip can't be planned for a day that has already passed.
function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// The 42 cells (6 weeks) covering a month, padded with the trailing days of the
// previous month and leading days of the next so every row is full.
function monthGrid(viewYear, viewMonth) {
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const start = new Date(firstOfMonth);
  start.setDate(1 - firstOfMonth.getDay()); // back up to the Sunday on/before the 1st
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    cells.push(day);
  }
  return cells;
}

// The calendar day the trip is planned for. A single boxed trigger shows the
// chosen date with a leading calendar icon; a custom month-grid calendar opens
// in a popup (closes on outside click / Escape). The YYYY-MM-DD string it stores
// is exactly what the backend expects for `tripDate`.
function DateField({ form, update }) {
  const [open, setOpen] = useState(false);
  const selected = parseLocal(form.tripDate);
  const initial = selected ?? new Date();
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // When opening, jump the grid to the selected month (or today) so the popup
  // never lingers on a stale month from a previous open.
  const toggle = () => {
    if (!open) {
      const base = parseLocal(form.tripDate) ?? new Date();
      setView({ year: base.getFullYear(), month: base.getMonth() });
    }
    setOpen((v) => !v);
  };

  const step = (delta) => {
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const today = startOfToday();

  const pick = (day) => {
    if (day < today) return; // past dates aren't selectable
    update('tripDate', toValue(day));
    setOpen(false);
  };

  const cells = monthGrid(view.year, view.month);
  const selectedValue = form.tripDate;

  return (
    <div className="date-field">
      <h2>Date <span className="field-required" aria-label="required">*</span></h2>
      <div className="date-field__wrap" ref={wrapRef}>
        <button
          type="button"
          className="date-field__trigger"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={toggle}
        >
          <svg
            className="date-field__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4.5" width="18" height="16" rx="2" />
            <path d="M3 9h18M8 3v3M16 3v3" />
          </svg>
          <span className={`date-field__summary${selected ? '' : ' date-field__summary--empty'}`}>
            {selected ? formatSummary(selected) : 'Select a date'}
          </span>
          <svg
            className={`date-field__chevron${open ? ' date-field__chevron--open' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>

        {open && (
          <div className="date-field__popup" role="dialog" aria-label="Choose a date">
            <div className="date-field__nav">
              <button type="button" className="date-field__nav-btn" aria-label="Previous month" onClick={() => step(-1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </button>
              <span className="date-field__month">{MONTH_NAMES[view.month]} {view.year}</span>
              <button type="button" className="date-field__nav-btn" aria-label="Next month" onClick={() => step(1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </div>

            <div className="date-field__weekdays">
              {WEEKDAYS.map((w) => (
                <span key={w} className="date-field__weekday">{w}</span>
              ))}
            </div>

            <div className="date-field__grid">
              {cells.map((day) => {
                const inMonth = day.getMonth() === view.month;
                const isSelected = toValue(day) === selectedValue;
                const isPast = day < today;
                return (
                  <button
                    key={toValue(day)}
                    type="button"
                    className={
                      'date-field__day'
                      + (inMonth ? '' : ' date-field__day--muted')
                      + (isSelected ? ' date-field__day--selected' : '')
                    }
                    aria-pressed={isSelected}
                    disabled={isPast}
                    onClick={() => pick(day)}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DateField;
