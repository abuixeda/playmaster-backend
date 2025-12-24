
// Centralized configuration for API URL
const getApiUrl = () => {
    // Default to localhost if not set (development fallback)
    let url = import.meta.env.VITE_API_URL || 'http://localhost:4001';

    // Remove trailing slash if present to avoid double slashes (e.g. url//api/auth)
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }

    return url;
};

export const API_URL = getApiUrl();

// Log once on import
console.log(`[Config] 🌍 API URL configurada: "${API_URL}"`);
