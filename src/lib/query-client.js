import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: true,
			refetchOnReconnect: true,
			retry: 2,
			retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 8000),
			staleTime: 1000 * 30, // 30 seconds
			gcTime: 1000 * 60 * 30,   // 30 minutes
			networkMode: 'offlineFirst',
		},
	},
});