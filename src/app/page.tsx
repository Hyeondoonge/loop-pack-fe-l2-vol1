'use client';

import { useState } from 'react';
import BundleSelect, { type BundleOption } from '@/components/commerce/BundleSelect/BundleSelect';
import SizeSelect, { type SizeOption } from '@/components/commerce/SizeSelect/SizeSelect';
import ThumbnailSelect, { type ThumbnailOption } from '@/components/commerce/ThumbnailSelect/ThumbnailSelect';

const bundleOptions: BundleOption[] = [
  { id: 'b5', label: '[최대할인] 베이글 5+5개', totalPrice: 21000, unitPrice: 2100, freeShipping: true },
  { id: 'b1', label: '베이글 1개', totalPrice: 4200, unitPrice: 4200, freeShipping: false }
];

const sizeOptions: SizeOption[] = [24, 25, 26, 27, 28].map((value) => ({
  value,
  inStock: value !== 25 && value !== 28
}));

const thumbnailOptions: ThumbnailOption[] = [
  { id: 't100', name: '그로우턴 앰플 100ml기획(+100ml)', image: '/next.svg', discountPercent: 2, price: 38800 },
  { id: 't130', name: '그로우턴 앰플 130ml기획(+30ml)', image: '/next.svg', discountPercent: 2, price: 33800 }
];

export default function Home() {
  const [bundle, setBundle] = useState<BundleOption | null>(null);
  const [size, setSize] = useState<SizeOption | null>(null);
  const [thumbnail, setThumbnail] = useState<ThumbnailOption | null>(null);

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '64px 24px', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Commerce</h1>
        <p style={{ color: '#5a6675', lineHeight: 1.7 }}>
          같은 <code>useSelect</code> 로직 위에 <code>Trigger</code>/<code>Option</code> 슬롯만 갈아끼운 3종 select다.
        </p>
      </div>

      <BundleSelect options={bundleOptions} onChange={setBundle} />
      <p style={{ color: '#5a6675', fontSize: 14 }}>선택값: {bundle ? `${bundle.totalPrice.toLocaleString()}원 · ${bundle.freeShipping ? '무료배송' : '배송비 별도'}` : '없음'}</p>

      <SizeSelect options={sizeOptions} onChange={setSize} />
      <p style={{ color: '#5a6675', fontSize: 14 }}>선택값: {size ? `${size.value}` : '없음'}</p>

      <ThumbnailSelect options={thumbnailOptions} onChange={setThumbnail} />
      <p style={{ color: '#5a6675', fontSize: 14 }}>선택값: {thumbnail ? `${thumbnail.name} · ${thumbnail.price.toLocaleString()}원` : '없음'}</p>
    </main>
  );
}
