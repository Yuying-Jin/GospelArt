/**
 * Fixed-window limiter held in module memory: good enough to blunt a form
 * flood, but each serverless instance counts on its own and a deploy resets
 * every window. Swap in a shared store if it ever guards something costly.
 */
type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const existing = windows.get(key);

    if (!existing || existing.resetAt <= now) {
        windows.set(key, { count: 1, resetAt: now + windowMs });
        // Expired entries are only dropped when someone else hits the route,
        // which keeps the map from growing without a timer to clean it.
        for (const [otherKey, window] of windows) {
            if (window.resetAt <= now) windows.delete(otherKey);
        }
        return { allowed: true, retryAfterSeconds: 0 };
    }

    existing.count += 1;
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

    return { allowed: existing.count <= limit, retryAfterSeconds };
}

/** First hop in `x-forwarded-for`; `request.ip` is gone as of Next 15. */
export function clientIp(headers: Headers): string {
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return headers.get("x-real-ip")?.trim() || "unknown";
}
