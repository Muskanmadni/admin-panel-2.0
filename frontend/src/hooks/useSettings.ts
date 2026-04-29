import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useSettings() {
  return useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    },
  });
}

export const buildEmailPattern = (allowedDomains: string | string[] | null) => {
  if (!allowedDomains) return null;
  const domains = Array.isArray(allowedDomains) ? allowedDomains : [allowedDomains];
  return new RegExp(`^[a-zA-Z0-9._%+-]+@(${domains.join('|').replace(/\./g, '\\.')})$`);
};

export const getEmailPlaceholder = (allowedDomains: string | string[] | null) => {
  if (!allowedDomains) return "name@company.com";
  const domains = Array.isArray(allowedDomains) ? allowedDomains : [allowedDomains];
  return `name@${domains[0]}`;
};

export const getEmailDomainError = (allowedDomains: string | string[] | null, orgName: string | null) => {
  const domains = Array.isArray(allowedDomains) ? allowedDomains : [allowedDomains];
  return `Only email addresses from ${domains.join(', ')} are allowed for ${orgName || 'this organization'}.`;
};

export const validateEmailDomain = (email: string, allowedDomains: string | string[] | null) => {
  if (!allowedDomains) return true;
  const domains = Array.isArray(allowedDomains) ? allowedDomains : [allowedDomains];
  const emailDomain = email.split('@')[1];
  return domains.includes(emailDomain);
};