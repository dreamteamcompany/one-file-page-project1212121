const AUTH_API = 'https://functions.poehali.dev/390bc680-77ff-4e34-a383-c92f6b67d723';
const GENERAL_API = 'https://functions.poehali.dev/adff2697-72f0-4316-9424-1f79ff8ed3cc';
const TICKETS_API = 'https://functions.poehali.dev/42feebee-e551-4872-901b-0512a2085c1a';
const COMPANIES_API = 'https://functions.poehali.dev/9ce1d908-bb39-4250-a1e3-8930ac0307de';
const DEPARTMENTS_API = 'https://functions.poehali.dev/b5550e9f-c621-44b8-b4e5-3128ed44acff';
const POSITIONS_API = 'https://functions.poehali.dev/176c438b-4080-43b6-b98d-21b4d7f54109';
const DEPT_POSITIONS_API = 'https://functions.poehali.dev/7c79f9e7-a51d-454b-b470-599ff9ed8527';

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
  'companies': COMPANIES_API,
  'departments': DEPARTMENTS_API,
  'positions': POSITIONS_API,
  'department-positions': DEPT_POSITIONS_API,
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

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let finalUrl = url;
  
  if (url.startsWith('/')) {
    const endpoint = url.split('/')[1].split('?')[0];
    if (ENDPOINT_MAP[endpoint]) {
      finalUrl = ENDPOINT_MAP[endpoint] + url.substring(endpoint.length + 1);
    }
  } else {
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
  }
  
  return fetch(finalUrl, {
    ...options,
    headers,
  });
};