/**
 * Utility functions for US phone formatting, validation, and timezone resolution
 */

export function cleanPhoneDigits(input: string): string {
  return input.replace(/\D/g, '');
}

export function formatUSPhone(input: string): string {
  let cleaned = cleanPhoneDigits(input);
  
  // If starts with 1 and length > 10, peel off 1
  if (cleaned.length > 10 && cleaned.startsWith('1')) {
    cleaned = cleaned.slice(1);
  }

  // Cap at 10 digits
  cleaned = cleaned.slice(0, 10);

  if (cleaned.length === 0) return '';
  if (cleaned.length <= 3) return `+1 (${cleaned}`;
  if (cleaned.length <= 6) return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
}

export function formatDisplayNumber(raw: string): string {
  if (!raw) return '';
  const digits = cleanPhoneDigits(raw);
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

export function isValidUSPhone(input: string): boolean {
  const digits = cleanPhoneDigits(input);
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

/**
 * Normalizes a US destination number into strict E.164 format (+1XXXXXXXXXX).
 * Validates US NANP requirements (area code and exchange code cannot start with 0 or 1).
 * Rejects invalid or incomplete phone numbers.
 */
export function normalizeUSE164(input: string): { valid: boolean; e164?: string; error?: string } {
  if (!input || !input.trim()) {
    return { valid: false, error: 'Destination phone number cannot be empty.' };
  }

  const digits = cleanPhoneDigits(input);

  // 10 digits: NPA-NXX-XXXX
  if (digits.length === 10) {
    const areaCodeFirst = digits[0];
    const exchangeFirst = digits[3];

    if (areaCodeFirst === '0' || areaCodeFirst === '1') {
      return {
        valid: false,
        error: `Invalid US area code (${digits.slice(0, 3)}). US area codes cannot start with ${areaCodeFirst}.`,
      };
    }

    if (exchangeFirst === '0' || exchangeFirst === '1') {
      return {
        valid: false,
        error: `Invalid US exchange code (${digits.slice(3, 6)}). US exchange codes cannot start with ${exchangeFirst}.`,
      };
    }

    return { valid: true, e164: `+1${digits}` };
  }

  // 11 digits starting with US country code '1': 1-NPA-NXX-XXXX
  if (digits.length === 11 && digits.startsWith('1')) {
    const areaCodeFirst = digits[1];
    const exchangeFirst = digits[4];

    if (areaCodeFirst === '0' || areaCodeFirst === '1') {
      return {
        valid: false,
        error: `Invalid US area code (${digits.slice(1, 4)}). US area codes cannot start with ${areaCodeFirst}.`,
      };
    }

    if (exchangeFirst === '0' || exchangeFirst === '1') {
      return {
        valid: false,
        error: `Invalid US exchange code (${digits.slice(4, 7)}). US exchange codes cannot start with ${exchangeFirst}.`,
      };
    }

    return { valid: true, e164: `+${digits}` };
  }

  return {
    valid: false,
    error: `Invalid US phone number length (${digits.length} digits). US phone numbers must be 10 digits (or 11 digits with country code 1).`,
  };
}

// Map major US area codes to Timezone & State
const AREA_CODE_MAP: Record<string, { state: string; tz: 'ET' | 'CT' | 'MT' | 'PT' }> = {
  // Eastern (ET)
  '212': { state: 'NY', tz: 'ET' },
  '347': { state: 'NY', tz: 'ET' },
  '646': { state: 'NY', tz: 'ET' },
  '718': { state: 'NY', tz: 'ET' },
  '917': { state: 'NY', tz: 'ET' },
  '516': { state: 'NY', tz: 'ET' },
  '617': { state: 'MA', tz: 'ET' },
  '202': { state: 'DC', tz: 'ET' },
  '305': { state: 'FL', tz: 'ET' },
  '404': { state: 'GA', tz: 'ET' },
  '215': { state: 'PA', tz: 'ET' },
  '703': { state: 'VA', tz: 'ET' },
  '201': { state: 'NJ', tz: 'ET' },
  '973': { state: 'NJ', tz: 'ET' },
  '704': { state: 'NC', tz: 'ET' },
  '410': { state: 'MD', tz: 'ET' },
  '313': { state: 'MI', tz: 'ET' },
  '216': { state: 'OH', tz: 'ET' },

  // Central (CT)
  '312': { state: 'IL', tz: 'CT' },
  '773': { state: 'IL', tz: 'CT' },
  '214': { state: 'TX', tz: 'CT' },
  '972': { state: 'TX', tz: 'CT' },
  '713': { state: 'TX', tz: 'CT' },
  '832': { state: 'TX', tz: 'CT' },
  '512': { state: 'TX', tz: 'CT' },
  '210': { state: 'TX', tz: 'CT' },
  '612': { state: 'MN', tz: 'CT' },
  '314': { state: 'MO', tz: 'CT' },
  '615': { state: 'TN', tz: 'CT' },
  '414': { state: 'WI', tz: 'CT' },
  '504': { state: 'LA', tz: 'CT' },

  // Mountain (MT)
  '303': { state: 'CO', tz: 'MT' },
  '720': { state: 'CO', tz: 'MT' },
  '602': { state: 'AZ', tz: 'MT' },
  '480': { state: 'AZ', tz: 'MT' },
  '623': { state: 'AZ', tz: 'MT' },
  '801': { state: 'UT', tz: 'MT' },
  '505': { state: 'NM', tz: 'MT' },
  '775': { state: 'NV', tz: 'MT' },
  '406': { state: 'MT', tz: 'MT' },
  '208': { state: 'ID', tz: 'MT' },

  // Pacific (PT)
  '213': { state: 'CA', tz: 'PT' },
  '310': { state: 'CA', tz: 'PT' },
  '415': { state: 'CA', tz: 'PT' },
  '628': { state: 'CA', tz: 'PT' },
  '510': { state: 'CA', tz: 'PT' },
  '408': { state: 'CA', tz: 'PT' },
  '650': { state: 'CA', tz: 'PT' },
  '858': { state: 'CA', tz: 'PT' },
  '619': { state: 'CA', tz: 'PT' },
  '949': { state: 'CA', tz: 'PT' },
  '206': { state: 'WA', tz: 'PT' },
  '503': { state: 'OR', tz: 'PT' },
  '702': { state: 'NV', tz: 'PT' },
};

export function getUSLocationFromPhone(phone: string): { state: string; tz: string } | null {
  const digits = cleanPhoneDigits(phone);
  let areaCode = '';
  if (digits.length === 10) {
    areaCode = digits.slice(0, 3);
  } else if (digits.length === 11 && digits.startsWith('1')) {
    areaCode = digits.slice(1, 4);
  }
  
  if (areaCode && AREA_CODE_MAP[areaCode]) {
    return AREA_CODE_MAP[areaCode];
  }
  return null;
}

export interface USTimezoneInfo {
  code: 'ET' | 'CT' | 'MT' | 'PT' | 'IST';
  label: string;
  cityName: string;
  timeString: string;
  isBusinessHours: boolean;
  timeZoneId: string;
}

export function getCurrentTimezones(): USTimezoneInfo[] {
  const now = new Date();

  const zones: { code: 'ET' | 'CT' | 'MT' | 'PT' | 'IST'; label: string; cityName: string; tzId: string }[] = [
    { code: 'IST', label: 'India Standard Time', cityName: 'Mumbai / Bangalore', tzId: 'Asia/Kolkata' },
    { code: 'ET', label: 'US Eastern', cityName: 'New York / Atlanta', tzId: 'America/New_York' },
    { code: 'CT', label: 'US Central', cityName: 'Chicago / Dallas', tzId: 'America/Chicago' },
    { code: 'MT', label: 'US Mountain', cityName: 'Denver / Phoenix', tzId: 'America/Denver' },
    { code: 'PT', label: 'US Pacific', cityName: 'San Francisco / Seattle', tzId: 'America/Los_Angeles' },
  ];

  return zones.map((z) => {
    try {
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: z.tzId,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const hourFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: z.tzId,
        hour: 'numeric',
        hourCycle: 'h23',
      });

      const dayFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: z.tzId,
        weekday: 'short',
      });

      const timeString = timeFormatter.format(now);
      const hour = parseInt(hourFormatter.format(now), 10);
      const weekday = dayFormatter.format(now);
      const isWeekday = weekday !== 'Sat' && weekday !== 'Sun';
      const isBusinessHours = isWeekday && hour >= 9 && hour < 17;

      return {
        code: z.code,
        label: z.label,
        cityName: z.cityName,
        timeString,
        isBusinessHours,
        timeZoneId: z.tzId,
      };
    } catch {
      return {
        code: z.code,
        label: z.label,
        cityName: z.cityName,
        timeString: '--:--',
        isBusinessHours: false,
        timeZoneId: z.tzId,
      };
    }
  });
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
