// src/lib/tenantcontext.ts
export const getTenantIdentifier = () => {
  const hostname = window.location.hostname;
  
  // If local testing: 'client1.localhost' -> 'client1'
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    return parts.length > 1 ? parts[0] : null;
  }

  // If production: 'client1.clicktake.tech' -> 'client1'
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }

  return null; // This is the main clicktake.tech site
};

export const getClientSlug = getTenantIdentifier;
