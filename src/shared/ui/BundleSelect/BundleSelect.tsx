// 번들 select — 묶음 가격 + 무료배송 뱃지 텍스트 행.
// 프리미티브 ui/select 위에 Trigger/Option/Root/List 슬롯과 스타일만 주입한다.

'use client';

import { Select, SelectRoot, SelectList, type ListSlotProps, type OptionSlotProps, type RootSlotProps, type TriggerSlotProps } from '@/shared/ui/select';
import styles from './BundleSelect.module.css';

export interface BundleOption {
  id: string;
  label: string;
  totalPrice: number;
  unitPrice: number;
  freeShipping: boolean;
}

interface BundleSelectProps {
  options: BundleOption[];
  onChange: (option: BundleOption) => void;
}

const Root = (props: RootSlotProps) => <SelectRoot {...props} className={styles.box} />;
const List = (props: ListSlotProps) => <SelectList {...props} className={styles.list} />;

function Trigger({ selected, isOpen, onToggle, onKeyDown }: TriggerSlotProps<BundleOption>) {
  return (
    <button type="button" onClick={onToggle} onKeyDown={onKeyDown} aria-expanded={isOpen} className={styles.trigger}>
      <span>{selected ? selected.label : '옵션 선택'}</span>
      <span className={styles.chevron}>⌄</span>
    </button>
  );
}

function OptionRow({ option, selected, highlighted, onSelect, onHighlight }: OptionSlotProps<BundleOption>) {
  return (
    <li role="option" aria-selected={selected} onClick={onSelect} onMouseEnter={onHighlight} className={highlighted ? `${styles.row} ${styles.highlighted}` : styles.row}>
      <div className={styles.rowTop}>
        <strong>{option.label}</strong>
        {option.freeShipping && <span className={styles.freeShipping}>무료배송</span>}
      </div>
      <div className={styles.priceLine}>
        <strong>{option.totalPrice.toLocaleString()}원</strong> <span className={styles.unitPrice}>(1개당 {option.unitPrice.toLocaleString()}원)</span>
      </div>
    </li>
  );
}

export default function BundleSelect({ options, onChange }: BundleSelectProps) {
  return <Select options={options} onChange={onChange} Trigger={Trigger} Option={OptionRow} Root={Root} List={List} />;
}
