import { readCatalog, type Movie, type MovieTheatreMapping, type Theatre } from '../../repositories/catalog-repository';

/** Read all movies that can begin the booking discovery journey. */
export function listMovies(): Movie[] {
  return readCatalog().movies;
}

/** Read theatres and the mappings that determine their movie availability. */
export function listTheatres(): { theatres: Theatre[]; movieTheatreMappings: MovieTheatreMapping[] } {
  const catalog = readCatalog();
  return { theatres: catalog.theatres, movieTheatreMappings: catalog.movieTheatreMappings };
}
