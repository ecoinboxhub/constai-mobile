import axios, { AxiosInstance } from "axios";

export interface ApiClientConfig {
  baseURL: string;
  getToken: () => Promise<string | null>;
  getRefreshToken: () => Promise<string | null>;
  saveTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  onSessionExpired: () => void;
}

export function createApiClient(config: ApiClientConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseURL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request Interceptor: inject token
  client.interceptors.request.use(
    async (requestConfig) => {
      try {
        const token = await config.getToken();
        if (token && requestConfig.headers) {
          requestConfig.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        console.error("Error reading access token", err);
      }
      return requestConfig;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor: refresh token flow on 401
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      const response = error.response;

      if (response && response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const refreshToken = await config.getRefreshToken();
          if (!refreshToken) {
            config.onSessionExpired();
            return Promise.reject(error);
          }

          // Request refresh from shared backend
          // Note: using client standard post without interceptors to avoid circular calls
          const refreshRes = await axios.post(
            `${config.baseURL}/auth/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${refreshToken}`,
              },
            }
          );

          if (refreshRes.status === 200 && refreshRes.data) {
            const { access_token, refresh_token } = refreshRes.data;
            await config.saveTokens(access_token, refresh_token);

            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return client(originalRequest);
          }
        } catch (refreshErr) {
          console.error("Session refresh failed", refreshErr);
          config.onSessionExpired();
          return Promise.reject(refreshErr);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}
