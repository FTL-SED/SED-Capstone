import './TimeRangeField.css'
import { useState, useRef, useEffect } from 'react'
import { formatTime12h } from '../../../utils/formatTime'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 60 }, (_, i) => i);   // 0..59
const PERIODS = ['AM', 'PM'];

// Split a 24h "HH:MM" value into wheel parts. Blank ⇒ a sensible default so the
// wheels always have something highlighted to scroll to.
function parseParts(value) {
  if (!value) return { hour12: 12, minute: 0, period: 'AM' };
  const [h, m] = value.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour12, minute: m, period };
}

// Reassemble wheel parts back into the 24h "HH:MM" string the backend expects.
function toValue({ hour12, minute, period }) {
  let h = hour12 % 12;
  if (period === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// One looping scroll column of the wheel. The options are repeated three times
// so the list can scroll past either end; when the user nears an edge we jump
// back to the equivalent spot in the middle copy, so hour 12 rolls straight on
// to 1 (and back) with no visible boundary. Non-looping columns (AM/PM) just
// centre the active option.
const WHEEL_COPIES = 3;

function Wheel({ options, value, onSelect, format = (v) => v, open, ariaLabel, loop = true }) {
  const listRef = useRef(null);
  const activeRef = useRef(null);
  const rendered = loop
    ? Array.from({ length: WHEEL_COPIES }, () => options).flat()
    : options;

  // Centre the middle copy's active item when the popup opens or the value
  // changes (so the highlight is always in view, mid-list for looping wheels).
  useEffect(() => {
    if (open && activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'center' });
    }
  }, [open, value]);

  // Keep an infinite feel: once scrolled within one block of either end, snap
  // back by exactly one options-length so there's always more to scroll.
  const handleScroll = () => {
    if (!loop) return;
    const el = listRef.current;
    if (!el) return;
    const block = el.scrollHeight / WHEEL_COPIES;
    if (el.scrollTop < block * 0.5) {
      el.scrollTop += block;
    } else if (el.scrollTop > block * (WHEEL_COPIES - 1.5)) {
      el.scrollTop -= block;
    }
  };

  // For looping wheels, highlight the copy in the MIDDLE block so scroll
  // recentring keeps the active item near the centre.
  const activeIndex = loop
    ? options.length + options.indexOf(value)
    : options.indexOf(value);

  return (
    <ul
      className="time-wheel"
      role="listbox"
      aria-label={ariaLabel}
      ref={listRef}
      onScroll={handleScroll}
    >
      {rendered.map((opt, i) => {
        const selected = opt === value;
        return (
          <li key={`${opt}-${i}`}>
            <button
              type="button"
              ref={i === activeIndex ? activeRef : null}
              role="option"
              aria-selected={selected}
              className={`time-wheel__item${selected ? ' time-wheel__item--selected' : ''}`}
              onClick={() => onSelect(opt)}
            >
              {format(opt)}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// A single custom time control: a boxed trigger showing "11:00 AM" and a
// wheel-style popup (hour / minute / AM-PM) themed with the accent, in place of
// the native time popup. Stores/reads the 24h "HH:MM" value.
function TimePicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const parts = parseParts(value);

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

  const change = (next) => onChange(toValue({ ...parts, ...next }));

  return (
    <div className="time-picker" ref={wrapRef}>
      <span className="time-picker__label">{label}</span>
      <button
        type="button"
        className="time-picker__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`time-picker__value${value ? '' : ' time-picker__value--empty'}`}>
          {value ? formatTime12h(value) : '--:--'}
        </span>
        <svg
          className={`time-picker__chevron${open ? ' time-picker__chevron--open' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="time-picker__popup" role="dialog" aria-label={`Choose ${label.toLowerCase()}`}>
          <Wheel
            options={HOURS}
            value={parts.hour12}
            onSelect={(hour12) => change({ hour12 })}
            open={open}
            ariaLabel="Hour"
          />
          <Wheel
            options={MINUTES}
            value={parts.minute}
            onSelect={(minute) => change({ minute })}
            format={(m) => String(m).padStart(2, '0')}
            open={open}
            ariaLabel="Minute"
          />
          <Wheel
            options={PERIODS}
            value={parts.period}
            onSelect={(period) => change({ period })}
            open={open}
            ariaLabel="AM or PM"
            loop={false}
          />
        </div>
      )}
    </div>
  );
}

// The window the group is free during the trip day: a start and an end time
// shown inline with a dash between, each a custom accent-themed wheel picker.
function TimeRangeField({ form, update }) {
  return (
    <div className="time-range-field">
      <h2>Group availability <span className="field-required" aria-label="required">*</span></h2>
      <div className="time-range-field__row">
        <TimePicker
          label="Start time"
          value={form.startTime}
          onChange={(v) => update('startTime', v)}
        />
        <span className="time-range-field__dash" aria-hidden="true">–</span>
        <TimePicker
          label="End time"
          value={form.endTime}
          onChange={(v) => update('endTime', v)}
        />
      </div>
    </div>
  );
}

export default TimeRangeField;
