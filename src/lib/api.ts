const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

const AUTH_EXPIRED_EVENT = "auth:expired";

// ─── Token Storage ────────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("accessToken", access);
  localStorage.setItem("refreshToken", refresh);
}

export function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

function notifyAuthExpired(reason: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(AUTH_EXPIRED_EVENT, {
      detail: { reason },
    })
  );
}

// ─── Internal refresh ────────────────────────────────────────────────────────

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    notifyAuthExpired("missing_refresh_token");
    return false;
  }
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      notifyAuthExpired("refresh_rejected");
      return false;
    }
    const data = await res.json();
    localStorage.setItem("accessToken", data.accessToken);
    return true;
  } catch {
    clearTokens();
    notifyAuthExpired("refresh_failed");
    return false;
  }
}

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: { field: string; message: string }[];
  requestId?: string;
}

export function isRateLimitError(err: unknown): boolean {
  return (err as ApiError)?.statusCode === 429;
}

// ─── Core request ─────────────────────────────────────────────────────────────

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const requestId = crypto.randomUUID();
  const accessToken = getAccessToken();
  const hadSession = !!accessToken || !!getRefreshToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-request-id": requestId,
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getAccessToken()}`;
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    }
  }

  if (
    res.status === 401 &&
    hadSession &&
    path !== "/auth/login" &&
    path !== "/auth/register" &&
    path !== "/auth/refresh"
  ) {
    clearTokens();
    notifyAuthExpired("request_unauthorized");
  }

  if (!res.ok) {
    const error: ApiError = await res
      .json()
      .catch(() => ({ statusCode: res.status, message: "Unknown error" }));
    throw { ...error, statusCode: res.status };
  }

  return res.json() as Promise<T>;
}

export { AUTH_EXPIRED_EVENT };
