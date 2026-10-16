/** Envelope for every successful JSON response. */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  requestId: string;
}

/** One entry per invalid field, produced by the global ValidationPipe. */
export interface ApiErrorDetail {
  field: string;
  messages: string[];
}

/** Body of every error response, regardless of where the error originated. */
export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  /** Stable, machine-readable identifier clients can branch on. */
  code: string;
  /** Safe, human-readable description. Never contains internals. */
  message: string;
  /** Present for validation failures. */
  details?: ApiErrorDetail[];
  requestId: string;
  timestamp: string;
}
