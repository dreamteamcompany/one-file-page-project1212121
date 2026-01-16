const API_BASE = 'https://functions.poehali.dev/3eae2c24-6b31-423b-ab37-dcd66c461749';

const ENDPOINT_MAP: Record<string, string> = {
  'services': 'https://functions.poehali.dev/2cfd72d5-c228-4dc9-af9b-f592d65be207',
  'payments': 'https://functions.poehali.dev/42303a3a-efd9-4863-9d99-b41962f017dc',
};

export const API_URL = API_BASE;

export const getApiUrl = (endpoint?: string): string => {
  if (endpoint && ENDPOINT_MAP[endpoint]) {
    return ENDPOINT_MAP[endpoint];
  }
  return API_BASE;
};

const getAuthToken = (): string | null => {
  const rememberMe = localStorage.getItem('remember_me') === 'true';
  return rememberMe 
    ? localStorage.getItem('auth_token')
    : sessionStorage.getItem('auth_token');
};

export const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    ...options.headers,
  };
  
  if (token) {
    headers['X-Auth-Token'] = token;
  }

  let finalUrl = url;
  
  try {
    const urlObj = new URL(url);
    const endpoint = urlObj.searchParams.get('endpoint');
    
    if (endpoint && ENDPOINT_MAP[endpoint]) {
      const newBase = ENDPOINT_MAP[endpoint];
      finalUrl = newBase + urlObj.search;
      console.log(`[API] Redirecting ${endpoint}: ${url} -> ${finalUrl}`);
    }
  } catch (e) {
    console.error('[API] URL parsing error:', e);
  }
  
  return fetch(finalUrl, {
    ...options,
    headers,
  });
};