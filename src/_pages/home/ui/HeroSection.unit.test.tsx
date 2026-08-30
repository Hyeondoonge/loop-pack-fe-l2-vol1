import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

describe('HeroSection', () => {
  it('배너 제목·설명과 최적화된 이미지 계약을 그대로 그린다', async () => {
    const { HeroSection } = await import('./HeroSection');

    const markup = renderToStaticMarkup(<HeroSection title="매일 새롭게 발견하는 취향" description="지금 가장 사랑받는 상품을 만나보세요." />);

    expect(markup).toContain('매일 새롭게 발견하는 취향');
    expect(markup).toContain('지금 가장 사랑받는 상품을 만나보세요.');
    expect(markup).toContain(encodeURIComponent('/images/week-07/hero-original.jpg'));
    expect(markup).toContain('sizes="(max-width: 1200px) 100vw, 1200px"');
  });
});
