import useSWR, { SWRConfiguration } from 'swr';
import { fetchApi } from '@/lib/api-client';

const fetcher = (url: string) => fetchApi(url, { method: 'GET' });

export function useApi<Data = any>(
  endpoint: string | null,
  options?: SWRConfiguration
) {
  const { data, error, mutate, isValidating } = useSWR<Data>(
    endpoint,
    fetcher,
    options
  );

  return {
    data,
    loading: !data && !error && endpoint !== null,
    error,
    isValidating,
    mutate,
  };
}
