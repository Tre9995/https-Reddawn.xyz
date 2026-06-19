// Add 'boot.pluto.tv' to your endpoint targets at the top of lib/pluto.js
const BOOT_URL = 'https://boot.pluto.tv/v4/start';
let sessionToken = null;

async function cachedGet(key, url, params = {}) {
  const cached = cache.get(key);
  if (cached) return cached;

  const combinedParams = { ...DEFAULT_PARAMS, ...params };

  // Fetch or renew the required session authorization token if it doesn't exist
  if (!sessionToken) {
    try {
      const bootResponse = await client.get(BOOT_URL, { params: combinedParams });
      if (bootResponse.data && bootResponse.data.sessionToken) {
        sessionToken = bootResponse.data.sessionToken;
      }
    } catch (bootErr) {
      console.error('[pluto] Failed to fetch session token:', bootErr.message);
    }
  }

  // Inject authorization headers if a token was successfully generated
  const config = { params: combinedParams };
  if (sessionToken) {
    config.headers = { ...client.defaults.headers, 'Authorization': `Bearer ${sessionToken}` };
  }

  const { data } = await client.get(url, config);
  cache.set(key, data);
  return data;
    }
