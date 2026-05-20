export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

function clampNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function isLatitude(value: number) {
  return value >= -90 && value <= 90;
}

function isLongitude(value: number) {
  return value >= -180 && value <= 180;
}

function parseDecimalPair(value: string): LocationCoordinates | null {
  const match = value.trim().match(/^([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)(?:\s*,.*)?$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!isLatitude(latitude) || !isLongitude(longitude)) {
    throw new Error('خط العرض أو خط الطول خارج النطاق المسموح');
  }
  return { latitude, longitude };
}

function parseDmsCoordinate(value: string): number | null {
  const match = value.trim().match(/^(\d{1,3})°?\s*(\d{1,2})['’]?\s*(\d{1,2}(?:\.\d+)?)?["]?\s*([NSEW])$/i);
  if (!match) return null;

  const degrees = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);
  const direction = match[4].toUpperCase();
  if (Number.isNaN(degrees) || Number.isNaN(minutes) || Number.isNaN(seconds)) return null;

  const decimal = degrees + minutes / 60 + seconds / 3600;
  if (direction === 'S' || direction === 'W') {
    return -decimal;
  }
  return decimal;
}

function parseDmsPair(value: string): LocationCoordinates | null {
  const trimmed = value.trim();
  const coordinates = [...trimmed.matchAll(/(\d{1,3}°?\s*\d{1,2}['’]?\s*\d{1,2}(?:\.\d+)?["]?\s*[NSEW])/gi)];
  if (coordinates.length < 2) return null;

  const latitude = parseDmsCoordinate(coordinates[0][1]);
  const longitude = parseDmsCoordinate(coordinates[1][1]);
  if (latitude === null || longitude === null) return null;
  if (!isLatitude(latitude) || !isLongitude(longitude)) {
    throw new Error('خط العرض أو خط الطول خارج النطاق المسموح');
  }

  return { latitude, longitude };
}

function parseAtCoordinates(value: string): LocationCoordinates | null {
  const match = value.match(/@([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)(?:,|\b)/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!isLatitude(latitude) || !isLongitude(longitude)) {
    throw new Error('خط العرض أو خط الطول خارج النطاق المسموح');
  }
  return { latitude, longitude };
}

function parseGoogleMapsUrl(value: string): LocationCoordinates | null {
  try {
    const url = new URL(value.trim());
    const qParam = url.searchParams.get('q');
    if (qParam) {
      return parseDecimalPair(decodeURIComponent(qParam));
    }

    const queryParam = url.searchParams.get('query');
    if (queryParam) {
      return parseDecimalPair(decodeURIComponent(queryParam));
    }

    const atMatch = url.pathname.match(/@([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)(?:,|\b)/);
    if (atMatch) {
      return parseAtCoordinates(atMatch[0]);
    }

    const pathMatch = url.pathname.match(/([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)(?:[/?]|$)/);
    if (pathMatch) {
      return parseDecimalPair(`${pathMatch[1]}, ${pathMatch[2]}`);
    }

    return null;
  } catch {
    return null;
  }
}

function isGoogleMapsUrl(value: string) {
  return /(?:maps\.google\.com|google\.com\/maps|goo\.gl\/maps|maps\.app\.goo\.gl|google\.com\/search)/i.test(value);
}

export function parseLocationInput(value: string): LocationCoordinates | null {
  if (!value || typeof value !== 'string') return null;

  const input = value.trim();
  if (!input) return null;

  const parsers = [parseDecimalPair, parseDmsPair, parseAtCoordinates];

  for (const parser of parsers) {
    const parsed = parser(input);
    if (parsed) return parsed;
  }

  const urlParsed = parseGoogleMapsUrl(input);
  if (urlParsed) return urlParsed;

  return null;
}

export function getGoogleMapsPreviewUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const input = String(value).trim();
  if (!input) return null;

  const parsed = parseLocationInput(input);
  if (parsed) {
    return `https://www.google.com/maps/search/?api=1&query=${parsed.latitude},${parsed.longitude}`;
  }

  if (isGoogleMapsUrl(input)) {
    return input;
  }

  try {
    // If the input is a general URL, return it.
    new URL(input);
    return input;
  } catch {
    return null;
  }
}
