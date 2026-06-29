/**
 * Route helpers for the Goals & KRA module (Plan B, Phase 4).
 * Maps thrown KraScopeError -> the matching HTTP status via createErrorResponse.
 */
import { createErrorResponse } from '@/lib/api-utils';
import { KraScopeError } from '@/lib/kra/scope';

export function handleKraError(error: unknown) {
  if (error instanceof KraScopeError) return createErrorResponse(error.message, error.status);
  return createErrorResponse(error);
}
