const AUTH_API = 'https://functions.poehali.dev/390bc680-77ff-4e34-a383-c92f6b67d723';
const GENERAL_API = 'https://functions.poehali.dev/adff2697-72f0-4316-9424-1f79ff8ed3cc';
const TICKETS_API = 'https://functions.poehali.dev/42feebee-e551-4872-901b-0512a2085c1a';

const ENDPOINT_MAP: Record<string, string> = {
  'login': AUTH_API,
  'me': AUTH_API,
  'refresh': AUTH_API,
  'users': GENERAL_API,
  'roles': GENERAL_API,
  'permissions': GENERAL_API,
  'user-permissions': GENERAL_API,
  'categories': GENERAL_API,
  'contractors': GENERAL_API,
  'legal_entities': GENERAL_API,
  'customer_departments': GENERAL_API,
  'tickets': TICKETS_API,
  'api-tickets': TICKETS_API,
  'service_categories': TICKETS_API,
  'ticket-dictionaries-api': TICKETS_API,
  'ticket_services': TICKETS_API,
  'ticket-statuses': TICKETS_API,
  'ticket-priorities': TICKETS_API,
  'sla': TICKETS_API,
  'ticket-approvals': TICKETS_API,
  'services': 'https://functions.poehali.dev/2cfd72d5-c228-4dc9-af9b-f592d65be207',
  'payments': 'https://functions.poehali.dev/42303a3a-efd9-4863-9d99-b41962f017dc',
};

export const API_URL = AUTH_API;

export const getApiUrl = (endpoint?: string): string => {
  if (endpoint && ENDPOINT_MAP[endpoint]) {
    return ENDPOINT_MAP[endpoint];
  }
  return AUTH_API;
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

  // Add Content-Type for requests with body
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let finalUrl = url;
  
  try {
    const urlObj = new URL(url);
    const endpoint = urlObj.searchParams.get('endpoint');
    
    if (endpoint && ENDPOINT_MAP[endpoint]) {
      const newBase = ENDPOINT_MAP[endpoint];
      finalUrl = newBase + urlObj.search;
    }
  } catch (e) {
    console.error('[API] URL parsing error:', e);
  }
  
  return fetch(finalUrl, {
    ...options,
    headers,
  });
};