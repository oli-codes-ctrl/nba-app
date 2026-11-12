/**
 * Static export: every page is real HTML at build time, so the site can be
 * hosted on any static host. `trailingSlash` makes each route a folder with
 * its own index.html, which every static host serves without rewrite rules.
 * NEXT_PUBLIC_BASE_PATH is for hosting under a sub-path (GitHub Pages project sites).
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default config;
