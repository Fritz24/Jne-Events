import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSlowNetwork = () => {
  if (typeof navigator === 'undefined') return false;
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return false;
  return conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g' || conn.saveData === true;
};

// Resilient fetch wrapper with auto-retry and timeout for mobile / 2G network connections
const resilientFetch = async (input, init = {}) => {
  const maxRetries = 2;
  const slowNet = isSlowNetwork();
  // Allow 35 seconds on slow 2G connections, 20 seconds standard
  const timeoutMs = slowNet ? 35000 : 20000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let combinedSignal = controller.signal;
    if (init.signal) {
      if (init.signal.aborted) {
        clearTimeout(timeoutId);
        throw new DOMException("Aborted", "AbortError");
      }
      init.signal.addEventListener("abort", () => controller.abort());
    }

    try {
      const response = await fetch(input, {
        ...init,
        signal: combinedSignal,
      });
      clearTimeout(timeoutId);

      // Retry on temporary server-side 5xx gateway errors
      if ([502, 503, 504].includes(response.status) && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, (slowNet ? 1000 : 600) * (attempt + 1)));
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbortByUser = init.signal?.aborted;
      if (isAbortByUser) throw err;

      // Rethrow if all retries exhausted
      if (attempt >= maxRetries) {
        console.warn(`[Supabase Fetch] Network request failed after ${attempt + 1} attempts:`, err.message || err);
        throw err;
      }

      // Exponential backoff before retry (longer on 2G to prevent channel choking)
      const backoffDelay = (slowNet ? 900 : 450) * (attempt + 1);
      await new Promise((r) => setTimeout(r, backoffDelay));
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: resilientFetch,
  },
});
