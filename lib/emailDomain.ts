import { Resolver } from "node:dns/promises";

/**
 * Whether an address's domain can receive mail at all. Only a definite "no" is
 * false: a lookup that times out or errors lets the address through, so our own
 * DNS trouble never turns a real visitor away.
 */
const resolver = new Resolver({ timeout: 3000, tries: 2 });

const NO_SUCH_DOMAIN = new Set(["ENOTFOUND", "ENODATA"]);

function definitelyMissing(error: unknown): boolean {
    return NO_SUCH_DOMAIN.has((error as { code?: string }).code ?? "");
}

export async function domainAcceptsMail(email: string): Promise<boolean> {
    const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();

    try {
        const records = await resolver.resolveMx(domain);
        // RFC 7505 null MX: the domain says outright that it takes no mail.
        return !records.every((record) => record.exchange === "" || record.exchange === ".");
    } catch (error) {
        if (!definitelyMissing(error)) return true;
    }

    // No MX: RFC 5321 falls back to the domain's own address records.
    try {
        return (await resolver.resolve4(domain)).length > 0;
    } catch (error) {
        return !definitelyMissing(error);
    }
}
