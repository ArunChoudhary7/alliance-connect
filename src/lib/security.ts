/**
 * ============================================================
 * SECURITY UTILITIES - AUConnect
 * ============================================================
 * OWASP-aligned security layer for client-side hardening.
 * Covers: Input sanitization, validation schemas, rate limiting.
 * ============================================================
 */

// ============================================================
// 1. INPUT SANITIZATION (XSS Prevention)
// ============================================================

/**
 * Strips HTML tags from user input to prevent XSS.
 * Use on all user-facing text before storing or rendering.
 */
export function sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') return '';
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize input for use in Supabase .ilike() / .or() filters.
 * Prevents SQL injection via PostgREST filter manipulation.
 * Removes characters that could break out of the filter context.
 */
export function sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') return '';
    // Remove PostgREST special characters that could alter query meaning
    return query
        .replace(/[%_\\(),.'"]/g, '') // Remove SQL wildcards and PostgREST operators
        .replace(/[^\w\s@.-]/g, '')   // Allow only word chars, spaces, @, dots, hyphens
        .trim()
        .slice(0, 100); // Hard length limit
}

/**
 * Strips script tags and event handlers from any string.
 * Lighter than full sanitization — good for display-only text.
 */
export function stripDangerousHTML(input: string): string {
    if (!input || typeof input !== 'string') return '';
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/on\w+\s*=\s*'[^']*'/gi, '')
        .replace(/javascript:/gi, '');
}

// ============================================================
// 2. INPUT VALIDATION (Schema-based)
// ============================================================

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/** Validates a username: 3-30 chars, alphanumeric + underscores only */
export function validateUsername(username: string): ValidationResult {
    if (!username || typeof username !== 'string') return { valid: false, error: 'Username is required' };
    const trimmed = username.trim();
    if (trimmed.length < 3) return { valid: false, error: 'Username must be at least 3 characters' };
    if (trimmed.length > 30) return { valid: false, error: 'Username must be 30 characters or fewer' };
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
    return { valid: true };
}

/** Validates a full name: 2-60 chars, letters and spaces */
export function validateFullName(name: string): ValidationResult {
    if (!name || typeof name !== 'string') return { valid: false, error: 'Name is required' };
    const trimmed = name.trim();
    if (trimmed.length < 2) return { valid: false, error: 'Name must be at least 2 characters' };
    if (trimmed.length > 60) return { valid: false, error: 'Name must be 60 characters or fewer' };
    return { valid: true };
}

/** Validates bio: max 300 chars */
export function validateBio(bio: string): ValidationResult {
    if (!bio || typeof bio !== 'string') return { valid: true }; // Bio is optional
    if (bio.trim().length > 300) return { valid: false, error: 'Bio must be 300 characters or fewer' };
    return { valid: true };
}

/** Validates post content: max 2000 chars */
export function validatePostContent(content: string): ValidationResult {
    if (!content || typeof content !== 'string') return { valid: true }; // Can be image-only
    if (content.trim().length > 2000) return { valid: false, error: 'Post content must be 2000 characters or fewer' };
    return { valid: true };
}

/** Validates comment content: 1-500 chars */
export function validateComment(content: string): ValidationResult {
    if (!content || typeof content !== 'string') return { valid: false, error: 'Comment cannot be empty' };
    const trimmed = content.trim();
    if (trimmed.length < 1) return { valid: false, error: 'Comment cannot be empty' };
    if (trimmed.length > 500) return { valid: false, error: 'Comment must be 500 characters or fewer' };
    return { valid: true };
}

/** Validates a message: 1-2000 chars */
export function validateMessage(content: string): ValidationResult {
    if (!content || typeof content !== 'string') return { valid: false, error: 'Message cannot be empty' };
    const trimmed = content.trim();
    if (trimmed.length < 1) return { valid: false, error: 'Message cannot be empty' };
    if (trimmed.length > 2000) return { valid: false, error: 'Message must be 2000 characters or fewer' };
    return { valid: true };
}

/** Validates email format */
export function validateEmail(email: string): ValidationResult {
    if (!email || typeof email !== 'string') return { valid: false, error: 'Email is required' };
    const trimmed = email.trim().toLowerCase();
    if (trimmed.length > 254) return { valid: false, error: 'Email is too long' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return { valid: false, error: 'Invalid email format' };
    return { valid: true };
}

/** Validates password: min 8 chars */
export function validatePassword(password: string): ValidationResult {
    if (!password || typeof password !== 'string') return { valid: false, error: 'Password is required' };
    if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters' };
    if (password.length > 128) return { valid: false, error: 'Password is too long' };
    return { valid: true };
}

/** Validates a URL */
export function validateUrl(url: string): ValidationResult {
    if (!url || typeof url !== 'string') return { valid: true }; // URLs are often optional
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return { valid: false, error: 'URL must use http or https' };
        }
        return { valid: true };
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }
}

/** Validates a UUID */
export function validateUUID(id: string): ValidationResult {
    if (!id || typeof id !== 'string') return { valid: false, error: 'ID is required' };
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) return { valid: false, error: 'Invalid ID format' };
    return { valid: true };
}

/**
 * Validates a profile update object.
 * Rejects unexpected fields and validates each known field.
 */
export function validateProfileUpdate(updates: Record<string, any>): ValidationResult {
    const allowedFields = new Set([
        'username', 'full_name', 'department', 'year', 'bio', 'bio_link',
        'avatar_url', 'banner_url', 'cover_url', 'skills', 'website',
        'is_private', 'show_activity', 'theme_config',
        'verification_status', 'verification_date', 'verified_title',
        'verification_expiry', 'is_verified'
    ]);

    for (const key of Object.keys(updates)) {
        if (!allowedFields.has(key)) {
            return { valid: false, error: `Unexpected field: ${key}` };
        }
    }

    if (updates.username) {
        const v = validateUsername(updates.username);
        if (!v.valid) return v;
    }
    if (updates.full_name) {
        const v = validateFullName(updates.full_name);
        if (!v.valid) return v;
    }
    if (updates.bio) {
        const v = validateBio(updates.bio);
        if (!v.valid) return v;
    }
    if (updates.bio_link) {
        const v = validateUrl(updates.bio_link);
        if (!v.valid) return v;
    }
    if (updates.website) {
        const v = validateUrl(updates.website);
        if (!v.valid) return v;
    }

    return { valid: true };
}


// ============================================================
// 3. CLIENT-SIDE RATE LIMITER
// ============================================================

/**
 * In-memory rate limiter for client-side throttling.
 * Tracks action counts per time window.
 *
 * IMPORTANT: This is a client-side convenience guard. Real rate
 * limiting MUST happen server-side (Supabase Edge Functions or
 * PostgREST rate limiting). This prevents accidental abuse and
 * double-clicks from the UI.
 *
 * Usage:
 *   const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60000 });
 *   if (!limiter.canProceed('signup')) return toast.error('Too many attempts');
 */
export class RateLimiter {
    private timestamps: Map<string, number[]> = new Map();
    private maxRequests: number;
    private windowMs: number;

    constructor({ maxRequests = 10, windowMs = 60_000 }: { maxRequests?: number; windowMs?: number } = {}) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    /**
     * Check if an action is within rate limits.
     * @param action - Identifier for the action (e.g., 'login', 'createPost')
     * @returns true if allowed, false if rate limited
     */
    canProceed(action: string): boolean {
        const now = Date.now();
        const timestamps = this.timestamps.get(action) || [];

        // Remove expired timestamps
        const validTimestamps = timestamps.filter(t => now - t < this.windowMs);

        if (validTimestamps.length >= this.maxRequests) {
            this.timestamps.set(action, validTimestamps);
            return false;
        }

        validTimestamps.push(now);
        this.timestamps.set(action, validTimestamps);
        return true;
    }

    /** Get remaining requests for an action */
    remaining(action: string): number {
        const now = Date.now();
        const timestamps = (this.timestamps.get(action) || []).filter(t => now - t < this.windowMs);
        return Math.max(0, this.maxRequests - timestamps.length);
    }

    /** Get milliseconds until the rate limit resets for an action */
    retryAfter(action: string): number {
        const timestamps = this.timestamps.get(action) || [];
        if (timestamps.length === 0) return 0;
        const oldest = Math.min(...timestamps);
        return Math.max(0, this.windowMs - (Date.now() - oldest));
    }
}

// ============================================================
// 4. PRE-CONFIGURED RATE LIMITERS
// ============================================================

/** Auth actions: 5 attempts per 60 seconds */
export const authLimiter = new RateLimiter({ maxRequests: 5, windowMs: 60_000 });

/** Post creation: 10 posts per 5 minutes */
export const postLimiter = new RateLimiter({ maxRequests: 10, windowMs: 300_000 });

/** Comment creation: 20 comments per minute */
export const commentLimiter = new RateLimiter({ maxRequests: 20, windowMs: 60_000 });

/** Search queries: 30 per minute */
export const searchLimiter = new RateLimiter({ maxRequests: 30, windowMs: 60_000 });

/** Profile updates: 10 per minute */
export const profileLimiter = new RateLimiter({ maxRequests: 10, windowMs: 60_000 });

/** Follow actions: 30 per minute */
export const followLimiter = new RateLimiter({ maxRequests: 30, windowMs: 60_000 });

/** Message sending: 60 per minute */
export const messageLimiter = new RateLimiter({ maxRequests: 60, windowMs: 60_000 });

/** Story creation: 5 per 10 minutes */
export const storyLimiter = new RateLimiter({ maxRequests: 5, windowMs: 600_000 });

/** Support tickets: 3 per 10 minutes */
export const supportLimiter = new RateLimiter({ maxRequests: 3, windowMs: 600_000 });
