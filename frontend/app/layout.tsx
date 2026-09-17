import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { SessionProvider } from '../providers/SessionProvider';

export const metadata: Metadata = {
  title: 'Identity access',
  description: 'Secure passwordless identity access.',
};

/** Provide global document structure and transient identity state. */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body><SessionProvider>{children}</SessionProvider></body></html>;
}
