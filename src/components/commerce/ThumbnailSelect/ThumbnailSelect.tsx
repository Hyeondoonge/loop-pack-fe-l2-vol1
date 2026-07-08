// 썸네일 select — 이미지+텍스트 가로 배치 + 할인율.

'use client';

import { Select, SelectRoot, SelectList, type ListSlotProps, type OptionSlotProps, type RootSlotProps, type TriggerSlotProps } from '@/components/ui/select';
import styles from './ThumbnailSelect.module.css';

export interface ThumbnailOption {
  id: string;
  name: string;
  image: string;
  discountPercent: number;
  price: number;
}

interface ThumbnailSelectProps {
  options: ThumbnailOption[];
  onChange: (option: ThumbnailOption) => void;
}

const Root = (props: RootSlotProps) => <SelectRoot {...props} className={styles.box} />;
const List = (props: ListSlotProps) => <SelectList {...props} className={styles.list} />;

function Trigger({ selected, isOpen, onToggle, onKeyDown }: TriggerSlotProps<ThumbnailOption>) {
  return (
    <button type="button" onClick={onToggle} onKeyDown={onKeyDown} aria-expanded={isOpen} className={styles.trigger}>
      <span>{selected ? `${selected.name} · ${selected.price.toLocaleString()}원` : '옵션을 선택해 주세요'}</span>
      <span className={styles.chevron}>⌄</span>
    </button>
  );
}

function OptionRow({ option, selected, highlighted, onSelect, onHighlight }: OptionSlotProps<ThumbnailOption>) {
  return (
    <li role="option" aria-selected={selected} onClick={onSelect} onMouseEnter={onHighlight} className={highlighted ? `${styles.row} ${styles.highlighted}` : styles.row}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 데모용 정적 아이콘, next/image 최적화 불필요 */}
      <img src={option.image} alt="" className={styles.thumb} />
      <div>
        <div>{option.name}</div>
        <div className={styles.priceLine}>
          <span className={styles.discount}>{option.discountPercent}%</span> <strong>{option.price.toLocaleString()}원</strong> <span className={styles.badge}>오늘드림</span>
        </div>
      </div>
    </li>
  );
}

export default function ThumbnailSelect({ options, onChange }: ThumbnailSelectProps) {
  return <Select options={options} onChange={onChange} Trigger={Trigger} Option={OptionRow} Root={Root} List={List} />;
}
