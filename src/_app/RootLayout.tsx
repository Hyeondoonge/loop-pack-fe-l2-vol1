import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Geist, Geist_Mono } from 'next/font/google';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import './styles/globals.css';
import './styles/commerce.css';
import Providers from './providers';
import { Header } from '@/widgets/header';
import { authQueries } from '@/entities/auth';
import { readSessionToken } from '../../app/api/_data/auth';
import { SESSION_COOKIE } from '../../app/api/_data/auth-cookies';
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN ?? 'http://localhost:3000'),
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
  const user = readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  const queryClient = getQueryClient();
  queryClient.setQueryData(authQueries.me().queryKey, user);

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
