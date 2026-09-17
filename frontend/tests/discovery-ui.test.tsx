// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '../app/dashboard/page';
import { SeatGrid } from '../components/SeatGrid';
import { TheatrePicker } from '../components/TheatrePicker';
import { JourneyProvider, useJourney } from '../providers/JourneyProvider';
import { SessionProvider, useSession } from '../providers/SessionProvider';

const push = vi.fn();
const replace = vi.fn();
const router = { push, replace };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

afterEach(() => { cleanup(); vi.restoreAllMocks(); push.mockReset(); replace.mockReset(); });

/** Establish an authenticated test session inside the real provider. */
function Authenticated({ children }: { children: React.ReactNode }) {
  const { establishSession } = useSession();
  const established = React.useRef(false);
  React.useEffect(() => {
    if (!established.current) {
      established.current = true;
      establishSession('signed-token', { id: 'usr-1', mobileNumber: '+15551234567', createdAt: '2026-01-01T00:00:00.000Z' });
    }
  }, [establishSession]);
  return <>{children}</>;
}

/** Expose journey state to assertions while exercising the public context action. */
function JourneyProbe() {
  const { seats, totalPaise, applyFixedSelection } = useJourney();
  return <><SeatGrid onSelectSeats={applyFixedSelection} /><output>{JSON.stringify({ seats, totalPaise })}</output></>;
}

describe('discovery user interface', () => {
  it('does not render a seat grid before a theatre is explicitly chosen', () => {
    render(<TheatrePicker movieId="mov_paradise" theatres={[{ id: 'thr_sandhya', name: 'Sandhya 70mm' }]} mappings={[{ movieId: 'mov_paradise', theatreId: 'thr_sandhya' }]} onChoose={() => undefined} />);
    expect(screen.queryByRole('heading', { name: 'Pick your view' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sandhya 70mm/ })).toBeInTheDocument();
  });

  it('writes the exact fixed seats and total when selecting seats', async () => {
    const user = userEvent.setup();
    render(<JourneyProvider><JourneyProbe /></JourneyProvider>);
    await user.click(screen.getByRole('button', { name: 'Select Seats' }));
    expect(screen.getByText('{"seats":["A1","A2","A3"],"totalPaise":45000}')).toBeInTheDocument();
  });

  it('renders the fetched authenticated catalog and chooses a backend movie', async () => {
    const user = userEvent.setup();
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { movies: [{ id: 'mov_paradise', title: 'Paradise' }, { id: 'mov_bloody_romeo', title: 'Bloody Romeo' }, { id: 'mov_og2', title: 'OG2' }] }, correlationId: 'c-1' }), { status: 200 }));
    render(<SessionProvider><JourneyProvider><Authenticated><DashboardPage /></Authenticated></JourneyProvider></SessionProvider>);
    expect(await screen.findByRole('button', { name: 'Choose Paradise' })).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/movies', expect.objectContaining({ headers: { authorization: 'Bearer signed-token' } }));
    await user.click(screen.getByRole('button', { name: 'Choose Paradise' }));
    expect(push).toHaveBeenCalledWith('/theatres');
  });
});
