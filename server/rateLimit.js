import rateLimit from 'express-rate-limit';

// Rate limit: max 10 room creations per IP per hour
export const roomCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10, // Limit each IP to 10 room creation requests per windowMs
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    error: 'Too many rooms created from this IP. Please try again in an hour.'
  }
});
