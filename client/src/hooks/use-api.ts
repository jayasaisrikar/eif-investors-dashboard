import { useState, useCallback, useEffect } from 'react';

interface UseApiOptions {
  autoFetch?: boolean;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for API calls with built-in error handling and loading states
 */
export function useApi<T>(
  url: string,
  options: UseApiOptions = { autoFetch: true }
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(options.autoFetch ?? true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url, { credentials: 'include' });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('You are not authenticated. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to access this resource.');
        } else if (response.status === 404) {
          throw new Error('The requested resource was not found.');
        } else {
          throw new Error(`Request failed with status ${response.status}`);
        }
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [url]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchData();
    }
  }, [fetchData, options.autoFetch]);

  return { data, loading, error, refetch: fetchData };
}
