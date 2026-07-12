import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ width: 640, margin: '0 auto', padding: '64px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Commerce</h1>
      <Link href="/select-demo">Select Demo</Link>
      <Link href="/dialog-demo">Dialog Demo</Link>
    </main>
  );
}
