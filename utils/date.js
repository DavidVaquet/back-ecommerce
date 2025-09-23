import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
dayjs.extend(utc); dayjs.extend(timezone);

const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires';

export const parseAndNormalize = (date_from, date_to, userTz) => {

    const tz = userTz || DEFAULT_TIMEZONE;

    const from = dayjs.tz(date_from, tz).startOf('day');
    const to = dayjs.tz(date_to, tz).endOf('day');

    if (!from.isValid() || !to.isValid()) throw new Error('Fechas invalidas');
    if (to.isBefore(from)) throw new Error('La fecha final no puede ser menor a la inicial.');

    const fromUTC = from.utc().toDate();
    const toUTC = to.utc().toDate();
    const rangeDays = to.diff(from, 'day') + 1;

    return { fromUTC, toUTC, rangeDays }
}

export function formatFecha(dt) {
    return dayjs(dt).format('YYYY-MM-DD HH:mm');
}