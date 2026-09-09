import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Geist, Geist_Mono } from 'next/font/google';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import './styles/globals.css';
import './styles/commerce.css';
import Providers from './providers';
import { Header } from '@/widgets/header';
import { authQueries } from '@/entities/auth';
import { getQueryClient } from '@/shared/api/getQueryClient';
import { commonOpenGraph, OG_FALLBACK_IMAGE, SITE_DESCRIPTION, SITE_NAME } from '@/shared/config/siteMetadata';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

function requireAppOrigin(): string {
  const origin = process.env.APP_ORIGIN;
  if (!origin) {
    throw new Error('APP_ORIGIN이 설정되지 않았습니다.');
  }
  return origin;
}

export const metadata: Metadata = {
  metadataBase: new URL(requireAppOrigin()),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: {
    ...commonOpenGraph,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [OG_FALLBACK_IMAGE]
  }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(authQueries.me((await cookies()).toString()));

  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <Providers>
          <HydrationBoundary state={dehydrate(queryClient)}>
            <Header />
            {children}
          </HydrationBoundary>
        </Providers>
      </body>
    </html>
  );
}
