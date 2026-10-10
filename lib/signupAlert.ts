import type { RecentPending } from "./emailoctopus";

/** New unconfirmed signups in a day above which staff are warned. Override with `SIGNUP_ALERT_THRESHOLD`. */
export const DEFAULT_SIGNUP_THRESHOLD = 20;

/** Addresses listed in the warning; the rest are only counted. */
const LISTED = 50;

/**
 * The warning for a day with too many unconfirmed signups, or `null` for a
 * normal day, when nothing is sent. Many at once usually means someone is
 * signing up other people's addresses, and every one gets a confirmation mail.
 */
export function buildSignupAlert(
    recent: RecentPending,
    threshold: number,
): { subject: string; text: string } | null {
    if (recent.count < threshold) return null;

    const count = recent.truncated ? `${recent.count}+` : String(recent.count);
    const listed = recent.addresses.slice(0, LISTED);
    const more = recent.count - listed.length;

    return {
        subject: `[sjgart.org] 過去 24 小時有 ${count} 個未確認的訂閱`,
        text: [
            `過去 24 小時，電子報新增了 ${count} 個未確認（pending）的訂閱，超過提醒門檻 ${threshold}。`,
            "",
            "若是有人批量填入別人的郵箱，這些人都會收到確認信，可能被舉報為垃圾郵件。",
            "",
            "可以這樣處理：",
            "1. 看下面的地址，判斷是真讀者還是被刷。",
            "2. 若是被刷：在 Vercel 的 Firewall 打開 Attack Mode，並在 EmailOctopus 刪除這批 pending 聯絡人。",
            "",
            "地址：",
            ...listed.map((address) => `- ${address}`),
            ...(more > 0 ? [`……另有 ${more} 個`] : []),
        ].join("\n"),
    };
}
