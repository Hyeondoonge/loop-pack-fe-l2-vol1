'use client';

import { useState } from 'react';
import styles from './page.module.css';
import { Select, SelectRoot, SelectList, type ListSlotProps, type OptionSlotProps, type RootSlotProps, type TriggerSlotProps } from '@/components/ui/select';

interface BundleOption {
  id: string;
  label: string;
  totalPrice: number;
  unitPrice: number;
  freeShipping: boolean;
}

const bundleOptions: BundleOption[] = [
  { id: 'b5', label: '[최대할인] 베이글 5+5개', totalPrice: 21000, unitPrice: 2100, freeShipping: true },
  { id: 'b1', label: '베이글 1개', totalPrice: 4200, unitPrice: 4200, freeShipping: false }
];

interface SizeOption {
  value: number;
  inStock: boolean;
}

const sizeOptions: SizeOption[] = [24, 25, 26, 27, 28].map((value) => ({
  value,
  inStock: value !== 25 && value !== 28
}));

interface ThumbnailOption {
  id: string;
  name: string;
  image: string;
  discountPercent: number;
  price: number;
}

const thumbnailOptions: ThumbnailOption[] = [
  { id: 't100', name: '그로우턴 앰플 100ml기획(+100ml)', image: '/next.svg', discountPercent: 2, price: 38800 },
  { id: 't130', name: '그로우턴 앰플 130ml기획(+30ml)', image: '/next.svg', discountPercent: 2, price: 33800 }
];

// 각 select는 스타일을 공유하지 않고 독립 소유한다 — 값이 같아도 분리해 select 간 결합을 없앤다.
// (SelectRoot/SelectList는 스타일 없는 공통 프리미티브라 재사용해도 스타일 의존이 생기지 않는다.)

// ── 번들(텍스트) 전용 ──
const bundleBoxStyle = { border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden' } as const;
const bundleListStyle = { maxHeight: 320, overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none' } as const;
const BundleRoot = (props: RootSlotProps) => <SelectRoot {...props} style={bundleBoxStyle} />;
const BundleList = (props: ListSlotProps) => <SelectList {...props} style={bundleListStyle} />;
function bundleRowStyle(index: number, highlighted: boolean) {
  return {
    padding: 16,
    borderTop: index === 0 ? 'none' : '1px solid #eef0f2',
    cursor: 'pointer',
    background: highlighted ? '#f3f5f7' : 'transparent'
  } as const;
}

// ── 사이즈 전용 (품절 처리 + 큰 행 높이) ──
const sizeBoxStyle = { border: '1px solid #d6dbe1', borderRadius: 6, overflow: 'hidden' } as const;
const sizeListStyle = { maxHeight: 320, overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none' } as const;
const SizeRoot = (props: RootSlotProps) => <SelectRoot {...props} style={sizeBoxStyle} />;
const SizeList = (props: ListSlotProps) => <SelectList {...props} style={sizeListStyle} />;
function sizeRowStyle(index: number, highlighted: boolean, disabled: boolean) {
  return {
    padding: '22px 16px',
    borderTop: index === 0 ? 'none' : '1px solid #eef0f2',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    background: highlighted && !disabled ? '#f3f5f7' : 'transparent'
  } as const;
}

// ── 썸네일 전용 (이미지+텍스트 가로 배치) ──
const thumbnailBoxStyle = { border: '1.5px solid #333333', borderRadius: 14, overflow: 'hidden' } as const;
const thumbnailListStyle = { maxHeight: 320, overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none' } as const;
const ThumbnailRoot = (props: RootSlotProps) => <SelectRoot {...props} style={thumbnailBoxStyle} />;
const ThumbnailList = (props: ListSlotProps) => <SelectList {...props} style={thumbnailListStyle} />;
function thumbnailRowStyle(index: number, highlighted: boolean) {
  return {
    padding: 16,
    borderTop: index === 0 ? 'none' : '1px solid #eef0f2',
    cursor: 'pointer',
    background: highlighted ? '#f3f5f7' : 'transparent',
    display: 'flex',
    gap: 12,
    alignItems: 'center'
  } as const;
}

function BundleTrigger({ selected, isOpen, onToggle, onKeyDown }: TriggerSlotProps<BundleOption>) {
  return (
    <button type="button" onClick={onToggle} onKeyDown={onKeyDown} aria-expanded={isOpen} className={styles.bundleTrigger}>
      <span>{selected ? selected.label : '옵션 선택'}</span>
      <span className={styles.bundleChevron}>⌄</span>
    </button>
  );
}

function BundleOptionRow({ option, selected, highlighted, onSelect, onHighlight }: OptionSlotProps<BundleOption>) {
  const index = bundleOptions.indexOf(option);
  return (
    <li role="option" aria-selected={selected} onClick={onSelect} onMouseEnter={onHighlight} style={bundleRowStyle(index, highlighted)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{option.label}</strong>
        {option.freeShipping && <span style={{ border: '1px solid #ff6b35', color: '#ff6b35', borderRadius: 999, padding: '2px 10px', fontSize: 12 }}>무료배송</span>}
      </div>
      <div style={{ marginTop: 6 }}>
        <strong>{option.totalPrice.toLocaleString()}원</strong> <span style={{ color: '#ff6b35' }}>(1개당 {option.unitPrice.toLocaleString()}원)</span>
      </div>
    </li>
  );
}

function SizeTrigger({ isOpen, onToggle, onKeyDown }: TriggerSlotProps<SizeOption>) {
  return (
    <button type="button" onClick={onToggle} onKeyDown={onKeyDown} aria-expanded={isOpen} className={styles.sizeTrigger}>
      <span style={{ color: '#8794a3' }}>사이즈</span>
      <span className={styles.sizeChevron}>⌄</span>
    </button>
  );
}

function SizeOptionRow({ option, selected, highlighted, disabled, onSelect, onHighlight }: OptionSlotProps<SizeOption>) {
  const index = sizeOptions.indexOf(option);
  return (
    <li role="option" aria-selected={selected} aria-disabled={disabled} onClick={disabled ? undefined : onSelect} onMouseEnter={disabled ? undefined : onHighlight} style={sizeRowStyle(index, highlighted, disabled)}>
      <div>{option.value}</div>
      {disabled ? <div style={{ color: '#c3c9d1', fontSize: 13 }}>품절</div> : <div style={{ color: '#2f6fed', fontSize: 13 }}>🚚 내일(토) 도착보장</div>}
    </li>
  );
}

function ThumbnailTrigger({ isOpen, onToggle, onKeyDown }: TriggerSlotProps<ThumbnailOption>) {
  return (
    <button type="button" onClick={onToggle} onKeyDown={onKeyDown} aria-expanded={isOpen} className={styles.thumbnailTrigger}>
      <span>옵션을 선택해 주세요</span>
      <span className={styles.thumbnailChevron}>⌄</span>
    </button>
  );
}

function ThumbnailOptionRow({ option, selected, highlighted, onSelect, onHighlight }: OptionSlotProps<ThumbnailOption>) {
  const index = thumbnailOptions.indexOf(option);
  return (
    <li role="option" aria-selected={selected} onClick={onSelect} onMouseEnter={onHighlight} style={thumbnailRowStyle(index, highlighted)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 데모용 정적 아이콘, next/image 최적화 불필요 */}
      <img src={option.image} alt="" width={48} height={48} />
      <div>
        <div>{option.name}</div>
        <div style={{ marginTop: 4 }}>
          <span style={{ color: '#ff3b30', fontWeight: 700 }}>{option.discountPercent}%</span> <strong>{option.price.toLocaleString()}원</strong>{' '}
          <span style={{ background: '#f3f5f7', borderRadius: 6, padding: '2px 6px', fontSize: 12 }}>오늘드림</span>
        </div>
      </div>
    </li>
  );
}

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

      <Select options={bundleOptions} onChange={setBundle} Trigger={BundleTrigger} Option={BundleOptionRow} Root={BundleRoot} List={BundleList} />
      <p style={{ color: '#5a6675', fontSize: 14 }}>선택값: {bundle ? `${bundle.totalPrice.toLocaleString()}원 · ${bundle.freeShipping ? '무료배송' : '배송비 별도'}` : '없음'}</p>

      <Select options={sizeOptions} onChange={setSize} isOptionDisabled={(option) => !option.inStock} Trigger={SizeTrigger} Option={SizeOptionRow} Root={SizeRoot} List={SizeList} />
      <p style={{ color: '#5a6675', fontSize: 14 }}>선택값: {size ? `${size.value}` : '없음'}</p>

      <Select options={thumbnailOptions} onChange={setThumbnail} Trigger={ThumbnailTrigger} Option={ThumbnailOptionRow} Root={ThumbnailRoot} List={ThumbnailList} />
      <p style={{ color: '#5a6675', fontSize: 14 }}>선택값: {thumbnail ? `${thumbnail.name} · ${thumbnail.price.toLocaleString()}원` : '없음'}</p>
    </main>
  );
}
