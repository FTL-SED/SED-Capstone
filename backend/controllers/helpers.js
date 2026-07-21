// Small shared helpers for the HTTP/controller layer. Keep these thin — just the
// repetitive request-parsing/response glue that would otherwise be copy-pasted
// across controllers.

// Parse a route `:id` param into a positive integer, or send a 400 and return
// null. Callers do: `const id = parseIdParam(req, res); if (id === null) return`.
// `label` names the resource in the error message (e.g. "itinerary id").
function parseIdParam(req, res, label = 'id') {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: `Invalid ${label}` })
    return null
  }
  return id
}

// Parse a value into a valid Date, or return null if it isn't a usable date.
// Shared by the pin/itinerary stop-creation paths that accept startTime/endTime.
function parseDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

// Load a row by id and enforce existence (404). Returns the row, or null after
// sending a 404 — callers do: `const row = await loadOrNotFound(...); if (!row) return`.
// `find` is a model function (id) => Promise<row|null>; `label` names the resource.
async function loadOrNotFound(res, find, id, label = 'Resource') {
  const row = await find(id)
  if (!row) {
    res.status(404).json({ error: `${label} not found` })
    return null
  }
  return row
}

// Load a row by id, enforce existence (404) AND ownership (403). `ownerId` is
// the row's owner-user field; `userId` is the caller. Returns the row, or null
// after sending the appropriate error. `action` completes the 403 message,
// e.g. "edit" → "You can only edit your own itineraries".
async function loadOwned(res, find, id, userId, { label = 'Resource', action = 'modify' } = {}) {
  const row = await loadOrNotFound(res, find, id, label)
  if (!row) return null
  const ownerId = typeof row.userId === 'number' ? row.userId : row.itinerary?.userId
  if (ownerId !== userId) {
    res.status(403).json({ error: `You can only ${action} your own itineraries` })
    return null
  }
  return row
}

export { parseIdParam, parseDate, loadOrNotFound, loadOwned }
