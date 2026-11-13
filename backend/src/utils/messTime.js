const TIME_ZONE = "Asia/Dhaka";

function getLocalParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

function dateFromKey(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function isRequestWindowOpen(lockTime, now = new Date()) {
  const { time } = getLocalParts(now);
  return time < lockTime;
}

module.exports = { TIME_ZONE, getLocalParts, dateFromKey, isRequestWindowOpen };
