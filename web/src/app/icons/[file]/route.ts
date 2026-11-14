/**
 * Site icons as real files: /icons/icon.svg (browser tab), icon-32.png
 * (tabs without SVG support), apple-touch-icon.png (home screens) and the
 * 192 / 512 icons of the web manifest. Linked from the root layout.
 */
import { ImageResponse } from 'next/og';
import { createElement } from 'react';

import { IconImage, iconSvg } from '@/og/icon';

export const dynamic = 'force-static';
export const dynamicParams = false;

const PNG: Record<string, { size: number; bleed: boolean }> = {
  'icon-32.png': { size: 32, bleed: false },
  'apple-touch-icon.png': { size: 180, bleed: true },
  'icon-192.png': { size: 192, bleed: true },
  'icon-512.png': { size: 512, bleed: true },
};

export function generateStaticParams() {
  return [{ file: 'icon.svg' }, ...Object.keys(PNG).map((file) => ({ file }))];
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (file === 'icon.svg') return new Response(iconSvg(), { headers: { 'Content-Type': 'image/svg+xml' } });
  const spec = PNG[file];
  if (!spec) return new Response('Not found', { status: 404 });
  return new ImageResponse(createElement(IconImage, spec), { width: spec.size, height: spec.size });
}
