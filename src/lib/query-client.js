import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			refetchOnReconnect: true,
			retry: 2,
			retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 8000),
			staleTime: 1000 * 60 * 3, // 3 minutes
			gcTime: 1000 * 60 * 30,   // 30 minutes
			networkMode: 'offlineFirst',
		},
	},
});