import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin'

/**
 * This machine's LAN addresses. The dev server only lets localhost reach its
 * HMR socket and dev assets, so the site opened by IP (from a phone, say)
 * loses every styled-jsx style; read at startup, so a new DHCP address works
 * after a restart. Development only.
 */
const lanAddresses = Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === 'IPv4' && !net.internal)
    .map((net) => net!.address);

const nextConfig: NextConfig = {
    reactStrictMode: true,
    allowedDevOrigins: lanAddresses,
    images: {
        remotePatterns:
            [
                {
                    protocol: 'https',
                    hostname: 'picsum.photos',
                },
                {
                    protocol: 'https',
                    hostname: 'cdn.sanity.io',
                },
            ],
    },
    output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
