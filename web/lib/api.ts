const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  timestamp: string;
  path: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

class ApiClient {
  private accessToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('df_access_token');
    }
  }

  setTokens(tokens: AuthTokens) {
    this.accessToken = tokens.accessToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('df_access_token', tokens.accessToken);
      localStorage.setItem('df_refresh_token', tokens.refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('df_access_token');
      localStorage.removeItem('df_refresh_token');
    }
  }

  async request<T>(
    path: string,
    options: RequestInit & { auth?: boolean } = {},
  ): Promise<T> {
    const { auth, headers, ...rest } = options;
    const finalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    };
    if (auth && this.accessToken) {
      finalHeaders.Authorization = `Bearer ${this.accessToken}`;
    }
    const res = await fetch(`${API_URL}${path}`, { ...rest, headers: finalHeaders });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.message || json?.data?.message || `Request failed (${res.status})`);
    }
    return (json.data ?? json) as T;
  }

  get<T>(path: string, auth = false) {
    return this.request<T>(path, { method: 'GET', auth });
  }
  post<T>(path: string, body: unknown, auth = false) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body), auth });
  }
  patch<T>(path: string, body: unknown, auth = false) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body), auth });
  }

  /** Upload an image directly to S3/MinIO via presigned URL, then mark as READY. */
  async uploadImage(file: File): Promise<{ mediaId: string }> {
    const meta = await this.post<{ mediaId: string; uploadUrl: string }>(
      '/media/upload-url',
      {
        type: 'IMAGE',
        mimeType: file.type || 'image/jpeg',
        sizeBytes: file.size,
        filename: file.name,
      },
      true,
    );
    const putRes = await fetch(meta.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'image/jpeg' },
    });
    if (!putRes.ok) {
      throw new Error(`Upload fallito (HTTP ${putRes.status})`);
    }
    await this.post(`/media/${meta.mediaId}/confirm-upload`, {}, true);
    return { mediaId: meta.mediaId };
  }
}

export const api = new ApiClient();
