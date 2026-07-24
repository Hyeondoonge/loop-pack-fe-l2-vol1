'use client';

import { useState, type CSSProperties } from 'react';
import Dialog from '@/components/ui/dialog';
import styles from '@/components/ui/dialog/dialog.module.css';

const boxStyle: CSSProperties = {
  background: '#fff',
  padding: 24,
  borderRadius: 8,
  minWidth: 280,
  display: 'flex',
  flexDirection: 'column',
  gap: 12
};

export default function DialogDemo() {
  const [open, setOpen] = useState(false);

  return (
    <main style={{ width: 640, margin: '0 auto', padding: '64px 24px', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Dialog Demo</h1>
        <p style={{ color: '#5a6675', lineHeight: 1.7 }}>compound 조립 + controlled/uncontrolled 이중 API 데모. Esc / 오버레이 클릭으로 닫힌다.</p>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Uncontrolled</h2>
        <Dialog>
          <Dialog.Trigger className={styles.trigger}>내부 Trigger</Dialog.Trigger>
          <Dialog.Overlay />
          <Dialog.Content>
            <div style={boxStyle}>
              <Dialog.Title className={styles.title}>장바구니에 담았습니다</Dialog.Title>
              <Dialog.Description className={styles.description}>선택하신 상품이 장바구니에 추가되었습니다.</Dialog.Description>
              <Dialog.Close className={styles.close} />
            </div>
          </Dialog.Content>
        </Dialog>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Controlled</h2>
        <p style={{ color: '#5a6675', fontSize: 14 }}>open: {String(open)}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setOpen(true)} className={styles.trigger}>
            외부 Trigger
          </button>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Dialog.Overlay />
          <Dialog.Content>
            <div style={boxStyle}>
              <Dialog.Title className={styles.title}>주문을 취소하시겠어요?</Dialog.Title>
              <Dialog.Description className={styles.description}>취소 후에는 되돌릴 수 없습니다. 계속 진행하시겠습니까?</Dialog.Description>
              <Dialog.Close className={styles.close} />
            </div>
          </Dialog.Content>
        </Dialog>
      </section>
    </main>
  );
}
