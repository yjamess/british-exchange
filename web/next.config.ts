import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Sector dataset pages are retired; /data is the one catalogue. Old links open the row.
      // Sector names only, so /api/data/:id (the CSV download) is not caught.
      {
        source: "/:sector(housing|economy|energy|people|government|infrastructure|regions|history)/data/:id",
        destination: "/data?record=:id",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
