export function notFound(req, res) {
  res.status(404).json({ error: 'Endpoint not found.' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must contain valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large.' });
  }

  if (error.name === 'ZodError') {
    return res.status(400).json({ error: 'Please check the submitted fields.', details: error.issues });
  }

  if (error.code === '23505') {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  if (error.code === '23503') {
    return res.status(400).json({ error: 'The selected team member does not exist.' });
  }

  if (error.code === '23514' || error.code === '22P02') {
    return res.status(400).json({ error: 'The submitted value is invalid.' });
  }
  if (Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 500) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  console.error(error);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
}