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

export { parseIdParam }
