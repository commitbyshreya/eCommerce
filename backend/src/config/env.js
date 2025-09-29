import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_CLIENT_URLS = [
  'https://e-commerce-join.vercel.app',
];

const allowAllClients = process.env.ALLOW_ALL_CLIENTS === 'true'
  || (process.env.ALLOW_ALL_CLIENTS !== 'false' && process.env.NODE_ENV !== 'production');

const configuredClientUrls = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((value) => value.trim()).filter(Boolean)
  : DEFAULT_CLIENT_URLS;

const clientUrls = allowAllClients ? [] : configuredClientUrls;

const sessionCookieName = process.env.SESSION_COOKIE_NAME || 'toolkart_session';
const sessionCookieDomain = process.env.SESSION_COOKIE_DOMAIN || undefined;

let sessionCookieSecure = process.env.SESSION_COOKIE_SECURE
  ? process.env.SESSION_COOKIE_SECURE === 'true'
  : process.env.NODE_ENV === 'production';

const rawSameSite = (process.env.SESSION_COOKIE_SAMESITE || '').toLowerCase();
const allowedSameSite = ['lax', 'strict', 'none'];
let sessionCookieSameSite = allowedSameSite.includes(rawSameSite)
  ? rawSameSite
  : sessionCookieSecure
    ? 'none'
    : 'lax';

const sessionCookieMaxAge = Number.parseInt(process.env.SESSION_COOKIE_MAX_AGE ?? '', 10);

if (allowAllClients && process.env.NODE_ENV !== 'production' && !process.env.SESSION_COOKIE_SAMESITE) {
  sessionCookieSecure = false;
  sessionCookieSameSite = 'lax';
}

export const config = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'toolkart-demo-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  allowAllClients,
  clientUrls,
  session: {
    cookieName: sessionCookieName,
    domain: sessionCookieDomain,
    secure: sessionCookieSecure,
    sameSite: sessionCookieSameSite,
    maxAge: Number.isFinite(sessionCookieMaxAge) ? sessionCookieMaxAge : 7 * 24 * 60 * 60 * 1000
  }
};
