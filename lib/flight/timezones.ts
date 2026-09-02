/**
 * Lightweight time-zone guess for an airport: country → IANA zone, with
 * longitude bands for the handful of countries that span several zones.
 * Falls back to a fixed UTC offset from longitude. Good enough for
 * "local time at destination" flavor without shipping a tz database.
 */

const SINGLE: Record<string, string> = {
  AE: 'Asia/Dubai', AR: 'America/Argentina/Buenos_Aires', AT: 'Europe/Vienna', BE: 'Europe/Brussels', BG: 'Europe/Sofia', BH: 'Asia/Bahrain',
  BS: 'America/Nassau', CH: 'Europe/Zurich', CL: 'America/Santiago', CN: 'Asia/Shanghai', CO: 'America/Bogota', CR: 'America/Costa_Rica',
  CU: 'America/Havana', CY: 'Asia/Nicosia', CZ: 'Europe/Prague', DE: 'Europe/Berlin', DK: 'Europe/Copenhagen', DO: 'America/Santo_Domingo',
  EG: 'Africa/Cairo', ES: 'Europe/Madrid', FI: 'Europe/Helsinki', FJ: 'Pacific/Fiji', FR: 'Europe/Paris', GB: 'Europe/London', GR: 'Europe/Athens',
  HK: 'Asia/Hong_Kong', HR: 'Europe/Zagreb', HU: 'Europe/Budapest', IE: 'Europe/Dublin', IL: 'Asia/Jerusalem', IN: 'Asia/Kolkata', IS: 'Atlantic/Reykjavik',
  IT: 'Europe/Rome', JM: 'America/Jamaica', JO: 'Asia/Amman', JP: 'Asia/Tokyo', KE: 'Africa/Nairobi', KR: 'Asia/Seoul', KW: 'Asia/Kuwait',
  LB: 'Asia/Beirut', LU: 'Europe/Luxembourg', MA: 'Africa/Casablanca', MC: 'Europe/Monaco', MT: 'Europe/Malta', MU: 'Indian/Mauritius', MV: 'Indian/Maldives',
  MY: 'Asia/Kuala_Lumpur', NG: 'Africa/Lagos', NL: 'Europe/Amsterdam', NO: 'Europe/Oslo', NZ: 'Pacific/Auckland', OM: 'Asia/Muscat', PA: 'America/Panama',
  PE: 'America/Lima', PH: 'Asia/Manila', PL: 'Europe/Warsaw', PR: 'America/Puerto_Rico', PT: 'Europe/Lisbon', QA: 'Asia/Qatar', RO: 'Europe/Bucharest',
  SA: 'Asia/Riyadh', SC: 'Indian/Mahe', SE: 'Europe/Stockholm', SG: 'Asia/Singapore', TH: 'Asia/Bangkok', TR: 'Europe/Istanbul', TW: 'Asia/Taipei',
  TZ: 'Africa/Dar_es_Salaam', UA: 'Europe/Kyiv', UY: 'America/Montevideo', VN: 'Asia/Ho_Chi_Minh', ZA: 'Africa/Johannesburg', KY: 'America/Cayman',
  BB: 'America/Barbados', AG: 'America/Antigua', LC: 'America/St_Lucia', VC: 'America/St_Vincent', TC: 'America/Grand_Turk', BM: 'Atlantic/Bermuda',
  GF: 'America/Cayenne', PF: 'Pacific/Tahiti', GU: 'Pacific/Guam', MP: 'Pacific/Saipan', AW: 'America/Aruba', CW: 'America/Curacao', SX: 'America/Lower_Princes',
  MF: 'America/Marigot', BL: 'America/St_Barthelemy', GP: 'America/Guadeloupe', MQ: 'America/Martinique', VG: 'America/Tortola', VI: 'America/St_Thomas',
  KN: 'America/St_Kitts', DM: 'America/Dominica', GD: 'America/Grenada', TT: 'America/Port_of_Spain', BZ: 'America/Belize', GT: 'America/Guatemala',
  HN: 'America/Tegucigalpa', SV: 'America/El_Salvador', NI: 'America/Managua', EC: 'America/Guayaquil', BO: 'America/La_Paz', PY: 'America/Asuncion',
  VE: 'America/Caracas', GE: 'Asia/Tbilisi', AM: 'Asia/Yerevan', AZ: 'Asia/Baku', UZ: 'Asia/Tashkent', KZ: 'Asia/Almaty', LK: 'Asia/Colombo', NP: 'Asia/Kathmandu',
  BD: 'Asia/Dhaka', MM: 'Asia/Yangon', KH: 'Asia/Phnom_Penh', LA: 'Asia/Vientiane', BN: 'Asia/Brunei', MO: 'Asia/Macau', MN: 'Asia/Ulaanbaatar',
  ET: 'Africa/Addis_Ababa', GH: 'Africa/Accra', SN: 'Africa/Dakar', CI: 'Africa/Abidjan', TN: 'Africa/Tunis', DZ: 'Africa/Algiers', LY: 'Africa/Tripoli',
  RW: 'Africa/Kigali', UG: 'Africa/Kampala', ZM: 'Africa/Lusaka', ZW: 'Africa/Harare', BW: 'Africa/Gaborone', NA: 'Africa/Windhoek', MZ: 'Africa/Maputo',
  MG: 'Indian/Antananarivo', RE: 'Indian/Reunion', CV: 'Atlantic/Cape_Verde', RS: 'Europe/Belgrade', SI: 'Europe/Ljubljana', SK: 'Europe/Bratislava',
  BA: 'Europe/Sarajevo', ME: 'Europe/Podgorica', AL: 'Europe/Tirane', MK: 'Europe/Skopje', EE: 'Europe/Tallinn', LV: 'Europe/Riga', LT: 'Europe/Vilnius',
  BY: 'Europe/Minsk', MD: 'Europe/Chisinau', GI: 'Europe/Gibraltar', AD: 'Europe/Andorra', LI: 'Europe/Vaduz', SM: 'Europe/San_Marino', FO: 'Atlantic/Faroe',
  IQ: 'Asia/Baghdad', IR: 'Asia/Tehran', PK: 'Asia/Karachi', AF: 'Asia/Kabul', BT: 'Asia/Thimphu', TL: 'Asia/Dili', PG: 'Pacific/Port_Moresby',
  NC: 'Pacific/Noumea', VU: 'Pacific/Efate', WS: 'Pacific/Apia', TO: 'Pacific/Tongatapu', CK: 'Pacific/Rarotonga', PW: 'Pacific/Palau',
};

function banded(country: string, lng: number, lat: number): string | undefined {
  switch (country) {
    case 'US':
      if (lng < -160) return 'Pacific/Honolulu';
      if (lng < -140) return 'America/Anchorage';
      if (lng < -114.5) return 'America/Los_Angeles';
      if (lng < -102) return lat > 31 && lng > -114 && lng < -109 ? 'America/Phoenix' : 'America/Denver';
      if (lng < -86) return 'America/Chicago';
      return 'America/New_York';
    case 'CA':
      if (lng < -120) return 'America/Vancouver';
      if (lng < -102) return 'America/Edmonton';
      if (lng < -89) return 'America/Winnipeg';
      if (lng < -63) return 'America/Toronto';
      if (lng < -56) return 'America/Halifax';
      return 'America/St_Johns';
    case 'MX':
      if (lng < -113) return 'America/Tijuana';
      if (lng < -105) return 'America/Mazatlan';
      return 'America/Mexico_City';
    case 'BR':
      if (lng < -66) return 'America/Rio_Branco';
      if (lng < -57) return 'America/Manaus';
      return 'America/Sao_Paulo';
    case 'AU':
      if (lng < 129) return 'Australia/Perth';
      if (lng < 141) return lat > -20 ? 'Australia/Darwin' : 'Australia/Adelaide';
      return lat > -29 && lng > 138 ? 'Australia/Brisbane' : 'Australia/Sydney';
    case 'RU':
      if (lng < 40) return 'Europe/Moscow';
      if (lng < 55) return 'Europe/Samara';
      if (lng < 68) return 'Asia/Yekaterinburg';
      if (lng < 78) return 'Asia/Omsk';
      if (lng < 90) return 'Asia/Novosibirsk';
      if (lng < 105) return 'Asia/Krasnoyarsk';
      if (lng < 118) return 'Asia/Irkutsk';
      if (lng < 135) return 'Asia/Yakutsk';
      if (lng < 150) return 'Asia/Vladivostok';
      return 'Asia/Magadan';
    case 'ID':
      if (lng < 114) return 'Asia/Jakarta';
      if (lng < 128) return 'Asia/Makassar';
      return 'Asia/Jayapura';
    case 'GL':
      return lng < -30 ? 'America/Nuuk' : 'America/Scoresbysund';
    case 'KI':
      return lng > 0 ? 'Pacific/Tarawa' : 'Pacific/Kiritimati';
    default:
      return undefined;
  }
}

export function guessTimeZone(country: string | undefined, lng: number, lat: number): string {
  if (country) {
    const b = banded(country, lng, lat);
    if (b) return b;
    if (SINGLE[country]) return SINGLE[country];
  }
  // Etc/GMT signs are inverted: Etc/GMT-8 is UTC+8.
  const off = Math.round(lng / 15);
  return off === 0 ? 'Etc/UTC' : `Etc/GMT${off > 0 ? '-' : '+'}${Math.abs(off)}`;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
export function formatLocalTime(atMs: number, tz: string, withDate = false): string {
  try {
    const key = tz + (withDate ? ':d' : ':t');
    let f = fmtCache.get(key);
    if (!f) {
      f = new Intl.DateTimeFormat('en-US', withDate ? { timeZone: tz, weekday: 'short', hour: 'numeric', minute: '2-digit' } : { timeZone: tz, hour: 'numeric', minute: '2-digit' });
      fmtCache.set(key, f);
    }
    return f.format(new Date(atMs));
  } catch {
    const off = tz.startsWith('Etc/GMT') ? -parseInt(tz.slice(7), 10) || 0 : 0;
    const d = new Date(atMs + off * 3600 * 1000);
    const h = d.getUTCHours(); const m = d.getUTCMinutes().toString().padStart(2, '0');
    return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
  }
}
