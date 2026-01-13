export const API_URL = 'https://functions.poehali.dev/8f2170d4-9167-4354-85a1-4478c2403dfd';

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
  
  return fetch(url, {
    ...options,
    headers,
  });
};