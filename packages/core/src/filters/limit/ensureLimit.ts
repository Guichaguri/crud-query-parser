import { ParsedRequest } from '../../models/parsed-request';

/**
 * Ensures that the limit will be set following a maximum rule
 *
 * @param request The parsed request
 * @param defaultLimit The default limit number
 * @param maxLimit The maximum allowed limit number
 */
export function ensureLimit(request: ParsedRequest, defaultLimit: number, maxLimit: number): ParsedRequest {
  return {
    ...request,
    limit: Math.min(Math.max(request.limit ?? defaultLimit, 1), maxLimit),
  };
}
