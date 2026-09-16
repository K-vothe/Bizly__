function rateLimit({ windowMs = 15 * 60 * 1000, max = 10 } = {}) {
  const buckets = new Map()
  let operations = 0

  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown'
    const now = Date.now()
    const current = buckets.get(key)

    operations += 1
    if (operations % 250 === 0) {
      for (const [bucketKey, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey)
      }
    }

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    current.count += 1
    if (current.count > max) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
      res.setHeader('Retry-After', String(retryAfter))
      return res.status(429).json({ error: 'Demasiados intentos. Intenta nuevamente más tarde.' })
    }

    next()
  }
}

module.exports = rateLimit
