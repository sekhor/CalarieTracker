const MALAYSIA_TIME_ZONE = 'Asia/Kuala_Lumpur';

function getMalaysiaDateParts(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MALAYSIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  });

  const values = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  return values;
}

function toMalaysiaDateKey(dateInput = new Date()) {
  const parts = getMalaysiaDateParts(dateInput);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getMalaysiaWeekday(dateInput = new Date()) {
  return getMalaysiaDateParts(dateInput).weekday;
}

module.exports = {
  MALAYSIA_TIME_ZONE,
  getMalaysiaDateParts,
  toMalaysiaDateKey,
  getMalaysiaWeekday,
};