// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '../app/dashboard/page';
import TheatresPage from '../app/theatres/page';
import { SeatGrid } from '../components/SeatGrid';
import { TheatrePicker } from '../components/TheatrePicker';
import { JourneyProvider, useJourney } from '../providers/JourneyProvider';
import { SessionProvider, useSession } from '../providers/SessionProvider';

const push = vi.fn();
const replace = vi.fn();
const router = { push, replace };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));

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

/** Establish the authenticated movie selection required by the theatre route. */
function SelectedMovie({ children }: { children: React.ReactNode }) {
  const { establishSession } = useSession();
  const { chooseMovie } = useJourney();
  const prepared = React.useRef(false);
  React.useEffect(() => {
    if (!prepared.current) {
      prepared.current = true;
      establishSession('signed-token', {
        id: 'usr-1',
        mobileNumber: '+15551234567',
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      chooseMovie({ id: 'mov_paradise', title: 'Paradise' });
    }
  }, [chooseMovie, establishSession]);
  return <>{children}</>;
}

/** Render the theatre route within its production provider contract. */
function renderTheatres(selectedMovie = true): void {
  render(
    <SessionProvider>
      <JourneyProvider>
        {selectedMovie ? (
          <SelectedMovie>
            <TheatresPage />
          </SelectedMovie>
        ) : (
          <Authenticated>
            <TheatresPage />
          </Authenticated>
        )}
      </JourneyProvider>
    </SessionProvider>,
  );
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

  it('redirects an anonymous dashboard visitor to login', async () => {
    render(<SessionProvider><JourneyProvider><DashboardPage /></JourneyProvider></SessionProvider>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });

  it('announces a rejected catalog request as an alert', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED' } }), { status: 401 }));
    render(<SessionProvider><JourneyProvider><Authenticated><DashboardPage /></Authenticated></JourneyProvider></SessionProvider>);
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not complete your request. Please try again.');
  });

  it('announces catalog loading while the authenticated request is pending', async () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => undefined));
    render(<SessionProvider><JourneyProvider><Authenticated><DashboardPage /></Authenticated></JourneyProvider></SessionProvider>);
    expect(await screen.findByRole('status')).toHaveTextContent('Loading the current program…');
  });

  it('announces when an authenticated catalog request successfully returns no films', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { movies: [] }, correlationId: 'c-empty' }), { status: 200 }));
    render(<SessionProvider><JourneyProvider><Authenticated><DashboardPage /></Authenticated></JourneyProvider></SessionProvider>);
    expect(await screen.findByRole('status')).toHaveTextContent('No films are currently available.');
  });

  it('redirects an anonymous theatre visitor to login after session hydration', async () => {
    window.sessionStorage.clear();
    render(<SessionProvider><JourneyProvider><TheatresPage /></JourneyProvider></SessionProvider>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
  });

  it('redirects an authenticated theatre visitor without a film to discovery', async () => {
    renderTheatres(false);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
  });

  it('announces theatre loading while availability is pending', async () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => undefined));
    renderTheatres();
    expect(await screen.findByRole('status')).toHaveTextContent('Loading theatres…');
  });

  it('announces a rejected theatre availability request as an alert', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Theatre availability could not be loaded.'));
    renderTheatres();
    expect(await screen.findByRole('alert')).toHaveTextContent('Theatre availability could not be loaded.');
  });

  it('announces empty availability when no fetched theatre is mapped to the chosen film', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      data: {
        theatres: [{ id: 'thr_sandhya', name: 'Sandhya 70mm' }],
        movieTheatreMappings: [],
      },
      correlationId: 'c-empty-theatres',
    }), { status: 200 }));
    renderTheatres();
    expect(await screen.findByRole('status')).toHaveTextContent('No theatres are available for this film.');
    expect(screen.queryByRole('button', { name: /Sandhya 70mm/ })).not.toBeInTheDocument();
  });

  it('reveals seat selection only after the user explicitly chooses an available theatre', async () => {
    const user = userEvent.setup();
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      data: {
        theatres: [{ id: 'thr_sandhya', name: 'Sandhya 70mm' }],
        movieTheatreMappings: [{ movieId: 'mov_paradise', theatreId: 'thr_sandhya' }],
      },
      correlationId: 'c-theatres',
    }), { status: 200 }));
    renderTheatres();
    const theatre = await screen.findByRole('button', { name: /Sandhya 70mm/ });
    expect(screen.queryByRole('heading', { name: 'Pick your view' })).not.toBeInTheDocument();
    await user.click(theatre);
    expect(screen.getByRole('heading', { name: 'Pick your view' })).toBeInTheDocument();
  });
});
