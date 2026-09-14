import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
    reactStrictMode: true,
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
