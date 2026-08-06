/**
 * The backend returns structured per-field validation errors on 400 responses:
 * { message: "Validation failed", fieldErrors: { content: "Review text is required" } }.
 * These helpers let forms show the specific message next to the offending field
 * instead of falling back to the generic top-level summary.
 */

export function extractFieldErrors(err) {
  return err?.response?.data?.fieldErrors || {}
}

export function hasFieldErrors(err) {
  return Object.keys(extractFieldErrors(err)).length > 0
}

/** First specific field error, else the request-level message, else the fallback. */
export function apiErrorMessage(err, fallback) {
  const data = err?.response?.data
  const fieldErrors = data?.fieldErrors
  if (fieldErrors) {
    const first = Object.values(fieldErrors)[0]
    if (first) return first
  }
  return data?.message || fallback
}