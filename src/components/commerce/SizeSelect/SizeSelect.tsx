// 사이즈 select — 숫자 사이즈 + 품절(비활성) + 도착보장 문구.

'use client';

import { Select, SelectRoot, SelectList, type ListSlotProps, type OptionSlotProps, type RootSlotProps, type TriggerSlotProps } from '@/components/ui/select';
import styles from './SizeSelect.module.css';

export interface SizeOption {
  value: number;
  inStock: boolean;
}

interface SizeSelectProps {
  options: SizeOption[];
  onChange: (option: SizeOption) => void;
}

const Root = (props: RootSlotProps) => <SelectRoot {...props} className={styles.box} />;
const List = (props: ListSlotProps) => <SelectList {...props} className={styles.list} />;

function Trigger({ isOpen, onToggle, onKeyDown }: TriggerSlotProps<SizeOption>) {
  return (
    <button type="button" onClick={onToggle} onKeyDown={onKeyDown} aria-expanded={isOpen} className={styles.trigger}>
      <span className={styles.placeholder}>사이즈</span>
      <span className={styles.chevron}>⌄</span>
    </button>
  );
}

function OptionRow({ option, selected, highlighted, disabled, onSelect, onHighlight }: OptionSlotProps<SizeOption>) {
  const rowClass = [styles.row, highlighted && !disabled && styles.highlighted, disabled && styles.disabled].filter(Boolean).join(' ');
  return (
    <li role="option" aria-selected={selected} aria-disabled={disabled} onClick={disabled ? undefined : onSelect} onMouseEnter={disabled ? undefined : onHighlight} className={rowClass}>
      <div>{option.value}</div>
      {disabled ? <div className={styles.soldOut}>품절</div> : <div className={styles.delivery}>🚚 내일(토) 도착보장</div>}
    </li>
  );
}

export default function SizeSelect({ options, onChange }: SizeSelectProps) {
  return <Select options={options} onChange={onChange} isOptionDisabled={(option) => !option.inStock} Trigger={Trigger} Option={OptionRow} Root={Root} List={List} />;
}
