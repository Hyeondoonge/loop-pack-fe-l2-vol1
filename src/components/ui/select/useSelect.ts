import { useState, type KeyboardEvent } from 'react';

interface UseSelectParams<T> {
  options: T[];
  onChange?: (option: T) => void;
  isOptionDisabled?: (option: T) => boolean;
}

interface UseSelectReturn<T> {
  selected: T | null;
  highlighted: T | null;
  isOpen: boolean;
  highlight: (option: T) => void;
  handleChange: (option: T) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
  toggle: () => void;
  close: () => void;
}

// AI 생성
function findNextEnabledIndex<T>(options: T[], fromIndex: number, direction: 1 | -1, isOptionDisabled: (option: T) => boolean): number {
  let index = fromIndex + direction;
  while (index >= 0 && index < options.length) {
    if (!isOptionDisabled(options[index])) return index;
    index += direction;
  }
  return fromIndex;
}

export function useSelect<T>({ options, onChange, isOptionDisabled = () => false }: UseSelectParams<T>): UseSelectReturn<T> {
  const [isOpen, setIsOpen] = useState(false);
  // 하이라이트 = 키보드/마우스 포인터가 현재 가리키는 위치. 선택값과 별개. -1이면 아무것도 안 가리킴.
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selected, setSelected] = useState<T | null>(null);

  const highlighted = highlightedIndex >= 0 ? (options[highlightedIndex] ?? null) : null;

  const close = () => setIsOpen(false);

  // 열 때 앵커: 선택값 위치(없으면 첫 활성 옵션)에서 키보드 이동을 시작한다.
  const open = () => {
    const selectedIndex = selected ? options.indexOf(selected) : -1;
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : options.findIndex((option) => !isOptionDisabled(option)));
    setIsOpen(true);
  };

  const toggle = () => (isOpen ? close() : open());

  // 마우스 포인터가 옵션에 진입하면 그 위치로 하이라이트를 옮긴다(비활성 옵션은 무시).
  const highlight = (option: T) => {
    if (isOptionDisabled(option)) return;
    const index = options.indexOf(option);
    if (index >= 0) setHighlightedIndex(index);
  };

  const handleChange = (option: T) => {
    if (isOptionDisabled(option)) return;
    setSelected(option);
    onChange?.(option);
    close();
  };

  // AI 생성
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isOpen) {
      if (['ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        open();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex((prev) => findNextEnabledIndex(options, prev, 1, isOptionDisabled));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex((prev) => findNextEnabledIndex(options, prev, -1, isOptionDisabled));
        break;
      case 'Enter':
        event.preventDefault();
        if (highlighted) handleChange(highlighted);
        break;
      case 'Escape':
        event.preventDefault();
        close();
        break;
    }
  };

  return { selected, highlighted, isOpen, highlight, handleChange, handleKeyDown, toggle, close };
}
