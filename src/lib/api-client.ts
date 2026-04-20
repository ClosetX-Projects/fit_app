const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fitappbackend-production.up.railway.app';

interface ApiOptions extends RequestInit {
  data?: any;
}

export async function fetchApi<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { headers, data, ...rest } = options;

  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('fitassist_token');
  }

  const config: RequestInit = {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string>),
    },
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  // Ensure endpoint starts with slash
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const response = await fetch(`${API_BASE_URL}${path}`, config);

  if (!response.ok) {
    let errorMessage = 'Erro na requisição da API';
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || JSON.stringify(errorData) || response.statusText;
    } catch (e) {
      errorMessage = response.statusText;
    }
    throw new Error(errorMessage);
  }

  // Retorna nulo se o corpo for vazio
  if (response.status === 204) {
    return null as any;
  }

  return response.json();
}
