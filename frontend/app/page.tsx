import { redirect } from 'next/navigation';

/** Send the root entry point to the identity workflow. */
export default function HomePage() {
  redirect('/login');
}
