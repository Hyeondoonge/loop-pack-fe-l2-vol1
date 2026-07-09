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

import { createContext, useContext, useEffect, useState } from 'react';

import styles from './dialog.module.css';

interface DialogContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function Dialog({ children }: { children: React.ReactNode }) {
  // 상태 관리
  const [open, setOpen] = useState(false);
  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>;
}

function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialogContext must be used within a Dialog');
  }
  return context;
}

function DialogTrigger({ children }: { children: React.ReactNode }) {
  // 이벤트 연결
  const { setOpen } = useDialogContext();
  return <button onClick={() => setOpen(true)}>{children}</button>;
}

function DialogOverlay({ children }: { children: React.ReactNode }) {
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
  return (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      {children}
    </div>
  );
}

function DialogContent({ children }: { children: React.ReactNode }) {
  const { setOpen } = useDialogContext();

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

  return <div onClick={(e) => e.stopPropagation()}>{children}</div>;
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
