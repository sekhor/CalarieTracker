const MALAYSIA_TIME_ZONE = 'Asia/Kuala_Lumpur';
const MALAYSIA_OFFSET = '+08:00';

function pad(value) {
  return String(value).padStart(2, '0');
}

function getMalaysiaParts(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
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

export function toMalaysiaDateKey(dateInput) {
  const parts = getMalaysiaParts(dateInput);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function toMalaysiaDateTimeLocalValue(dateInput = new Date()) {
  const parts = getMalaysiaParts(dateInput);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function malaysiaDateTimeLocalToIso(value) {
  if (!value) return null;
  return `${value}:00${MALAYSIA_OFFSET}`;
}

export function formatMalaysiaDate(dateInput, options = {}) {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: MALAYSIA_TIME_ZONE,
    ...options,
  }).format(new Date(dateInput));
}

export function formatMalaysiaTime(dateInput, options = {}) {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: MALAYSIA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  }).format(new Date(dateInput));
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