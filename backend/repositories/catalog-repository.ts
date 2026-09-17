import { getDatabase } from '../db/database';

/** Represent a movie available for discovery. */
export interface Movie {
  id: string;
  title: string;
}

/** Represent a theatre available for a movie screening. */
export interface Theatre {
  id: string;
  name: string;
}

/** Represent an explicit movie-to-theatre availability relation. */
export interface MovieTheatreMapping {
  movieId: string;
  theatreId: string;
}

/** Read the seeded discovery catalog from SQLite. */
export function readCatalog(): { movies: Movie[]; theatres: Theatre[]; movieTheatreMappings: MovieTheatreMapping[] } {
  const database = getDatabase();
  const movies = database.prepare('SELECT id, title FROM movies ORDER BY id').all() as Movie[];
  const theatres = database.prepare('SELECT id, name FROM theatres ORDER BY id').all() as Theatre[];
  const movieTheatreMappings = database.prepare('SELECT movie_id AS movieId, theatre_id AS theatreId FROM movie_theatres ORDER BY movie_id, theatre_id').all() as MovieTheatreMapping[];
  return { movies, theatres, movieTheatreMappings };
}
