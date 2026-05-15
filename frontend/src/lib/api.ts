import { supabase } from './supabase';

// Use relative path to leverage Vite proxy
const API_BASE_URL = '/api/v1';

async function getHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const tokenPreview = session?.access_token ? session.access_token.slice(0, 20) : 'none';
  console.log('getSession result:', session ? 'has session' : 'no session', tokenPreview);
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return headers;
}

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'API request failed');
    }

    return response.json();
  },

  async post<T>(endpoint: string, data: any): Promise<T> {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'API request failed');
    }

    return response.json();
  },

  async put<T>(endpoint: string, data: any): Promise<T> {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'API request failed');
    }

    return response.json();
  },

  async delete<T>(endpoint: string): Promise<T> {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'API request failed');
    }

    return response.json();
  },

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'API request failed');
    }

    return response.json();
  },
};
