import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { SessionProvider } from '../providers/SessionProvider';
import { JourneyProvider } from '../providers/JourneyProvider';

export const metadata: Metadata = {
  title: 'Identity access',
  description: 'Secure passwordless identity access.',
};

/** Provide global document structure and transient identity state. */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body><SessionProvider><JourneyProvider>{children}</JourneyProvider></SessionProvider></body></html>;
}
