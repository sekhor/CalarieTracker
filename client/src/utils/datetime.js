const MALAYSIA_TIME_ZONE = 'Asia/Kuala_Lumpur';
const MALAYSIA_OFFSET = '+08:00';

function pad(value) {
  return String(value).padStart(2, '0');
}

function getMalaysiaParts(dateInput = new Date()) {
  let date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    date = new Date();
  }
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MALAYSIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const values = {};

  parts.forEach((part) => {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  });

  return values;
}

export function toMalaysiaDateKey(dateInput = new Date()) {
  const parts = getMalaysiaParts(dateInput);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function toMalaysiaDateTimeLocalValue(dateInput = new Date()) {
  const parts = getMalaysiaParts(dateInput);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function malaysiaDateTimeLocalToIso(value) {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') {
    if (value.includes('Z') || /[+-]\d{2}:\d{2}$/.test(value)) {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
      return `${value}:00${MALAYSIA_OFFSET}`;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      const clean = value.slice(0, 19);
      return `${clean}${MALAYSIA_OFFSET}`;
    }
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function formatMalaysiaDate(dateInput, options = {}) {
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-MY', {
      timeZone: MALAYSIA_TIME_ZONE,
      ...options,
    }).format(d);
  } catch {
    return '';
  }
}

export function formatMalaysiaTime(dateInput, options = {}) {
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-MY', {
      timeZone: MALAYSIA_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      ...options,
    }).format(d);
  } catch {
    return '';
  }
}

export function getCurrentMalaysiaDateLabel() {
  return formatMalaysiaDate(new Date(), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getTodayMalaysiaDateKey() {
  return toMalaysiaDateKey(new Date());
}

export { MALAYSIA_TIME_ZONE, MALAYSIA_OFFSET, pad };