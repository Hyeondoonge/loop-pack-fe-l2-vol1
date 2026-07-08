// Select (Headless) — 4주차 1단계, 셸(구조)
//
// 설계 SSOT: docs/work/week-04/select-shell-설계.md
// useSelect(변경 없음)가 노출한 상태를 Trigger/Option 슬롯에 props로 내려줄 뿐,
// 마크업·스타일 결정권은 전혀 갖지 않는다(DIP: 구체 컴포넌트가 아니라 슬롯 계약에 의존).

'use client';

import { type ComponentType, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { useSelect } from './useSelect';

export interface OptionSlotProps<T> {
  option: T;
  selected: boolean;
  highlighted: boolean;
  disabled: boolean;
  onSelect: () => void;
  // 마우스가 이 옵션에 진입했음을 알린다 — 사용처가 onMouseEnter에 연결한다.
  onHighlight: () => void;
}

export interface TriggerSlotProps<T> {
  selected: T | null;
  isOpen: boolean;
  onToggle: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
}

export interface RootSlotProps {
  isOpen: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export interface ListSlotProps {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

// 공유 기본 컴포넌트 — a11y(role/data-open)를 소유하고 className/style을 그대로 흘려보낸다.
// 사용처는 이 둘을 부분 적용해 스타일만 주입하거나, 마크업까지 다르면 자기 컴포넌트로 교체한다.
export function SelectRoot({ isOpen, className, style, children }: RootSlotProps) {
  return (
    <div className={className} style={style} data-open={isOpen}>
      {children}
    </div>
  );
}

// role="listbox"는 이 기본 구현이 직접 소유한다. 커스텀 List로 교체하면 그 구현이 role을 선언한다.
export function SelectList({ className, style, children }: ListSlotProps) {
  return (
    <ul role="listbox" className={className} style={style}>
      {children}
    </ul>
  );
}

interface SelectProps<T> {
  options: T[];
  onChange?: (option: T) => void;
  isOptionDisabled?: (option: T) => boolean;
  Root?: ComponentType<RootSlotProps>;
  Trigger: ComponentType<TriggerSlotProps<T>>;
  List?: ComponentType<ListSlotProps>;
  Option: ComponentType<OptionSlotProps<T>>;
}

export function Select<T>({ options, onChange, isOptionDisabled = () => false, Root = SelectRoot, Trigger, List = SelectList, Option }: SelectProps<T>) {
  const { selected, highlighted, isOpen, highlight, handleChange, handleKeyDown, toggle } = useSelect({
    options,
    onChange,
    isOptionDisabled
  });

  return (
    <Root isOpen={isOpen}>
      <Trigger selected={selected} isOpen={isOpen} onToggle={toggle} onKeyDown={handleKeyDown} />
      {isOpen && (
        <List>
          {options.map((option, index) => (
            <Option
              // 옵션 목록은 정적(재정렬/삽입/삭제 없음)이라 index key 예외 허용
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              option={option}
              selected={option === selected}
              highlighted={option === highlighted}
              disabled={isOptionDisabled(option)}
              onSelect={() => handleChange(option)}
              onHighlight={() => highlight(option)}
            />
          ))}
        </List>
      )}
    </Root>
  );
}
