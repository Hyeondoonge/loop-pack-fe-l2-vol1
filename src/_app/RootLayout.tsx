import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './styles/globals.css';
import './styles/commerce.css';
import Providers from './providers';
import { Header } from '@/widgets/header';
import { commonOpenGraph, OG_FALLBACK_IMAGE, SITE_DESCRIPTION, SITE_NAME } from '@/shared/config/siteMetadata';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

// AI 생성: week-07 3단계 — APP_ORIGIN이 없으면 metadataBase를 만들 수 없어 모듈 로드 시점에
// 바로 던진다. build·runtime에 같은 값을 요구하는 발제 조건상, 조용히 넘어가지 않고 빠르게 실패시킨다.
const appOrigin = process.env.APP_ORIGIN;
if (!appOrigin) {
  throw new Error('APP_ORIGIN 환경변수가 필요합니다.');
}

export const metadata: Metadata = {
  metadataBase: new URL(appOrigin),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: {
    ...commonOpenGraph,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [OG_FALLBACK_IMAGE]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
