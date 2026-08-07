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

// AI 생성: week-07 3단계 — CI(quality.yml)는 APP_ORIGIN 없이 pnpm check를 돌린다. 이 값이 없으면
// build 즉시 실패하게 만들면(과거 버전) 루트 layout의 module 최상위 코드라 모든 라우트의 page data
// 수집 단계에서 터진다. Next.js도 metadataBase를 선택 항목으로 정의해 없으면 경고만 내고
// localhost로 폴백하므로(resolve-opengraph.js), 그 계약을 그대로 따른다. 측정·재현 절차에서
// APP_ORIGIN을 설정하면 이 폴백은 적용되지 않아 기존 동작과 동일하다.
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
