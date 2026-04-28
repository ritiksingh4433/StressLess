export const GOOGLE_CLIENT_ID_FALLBACK = '941813256456-k6uonsb8qmrqj7q2uql3r3njl23e0qpj.apps.googleusercontent.com';

export const getGoogleClientId = () =>
  import.meta.env.VITE_GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID_FALLBACK;
