// app/page.tsx
'use client';

import { ConfigProvider, theme } from 'antd';
import HexGrid from '@/components/HexGrid';

export default function Home() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
      }}
    >
      <main className="w-screen h-screen overflow-hidden">
        <HexGrid />
      </main>
    </ConfigProvider>
  );
}
