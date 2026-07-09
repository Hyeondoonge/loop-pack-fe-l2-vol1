// Dialog (Compound) — 4주차 2단계
//
// 여기에 직접 만든다. compound 조립과 controlled/uncontrolled 이중 API가 알맹이다.
// 요구사항 요약 (자세한 건 docs/assignments/week-04.md):
//   - compound: Dialog / Dialog.Trigger / Dialog.Overlay / Dialog.Content /
//               Dialog.Title / Dialog.Description / Dialog.Close
//   - controlled(open·onOpenChange)와 uncontrolled 둘 다 지원 (open prop 유무로 판별)
//   - Content/Overlay는 Portal로 렌더
//   - Esc / 오버레이 클릭으로 닫고, 열린 동안 배경 스크롤 잠금
//   - (이번 주 범위 밖) 포커스 트랩·ARIA는 하지 않는다. compound + 이중 API에 집중.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from './dialog.module.css';
import { DialogContext, useDialogContext } from './DialogContext';

interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
}

function Dialog({ children, open: openProp, onOpenChange }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>;
}
function DialogTrigger({ children }: { children: React.ReactNode }) {
  // 이벤트 연결
  const { setOpen } = useDialogContext();
  return <button onClick={() => setOpen(true)}>{children}</button>;
}

function DialogOverlay() {
  const { open, setOpen } = useDialogContext();

  useEffect(() => {
    if (!open) {
      return;
    }

    const html = document.documentElement;
    const prevHtmlOverflow = html.style.overflow;
    html.style.overflow = 'hidden';

    return () => {
      html.style.overflow = prevHtmlOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const handleOverlayClick = () => setOpen(false);

  return createPortal(<div className={styles.overlay} onClick={handleOverlayClick} />, document.body);
}

function DialogContent({ children }: { children?: React.ReactNode }) {
  const { open, setOpen } = useDialogContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!open) {
    return null;
  }

  return createPortal(<div className={styles.content}>{children}</div>, document.body);
}

function DialogTitle({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function DialogDescription({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function DialogClose() {
  const { setOpen } = useDialogContext();
  return <button onClick={() => setOpen(false)}>Close</button>;
}

Dialog.Trigger = DialogTrigger;
Dialog.Overlay = DialogOverlay;
Dialog.Content = DialogContent;
Dialog.Title = DialogTitle;
Dialog.Description = DialogDescription;
Dialog.Close = DialogClose;

export default Dialog;
