import type Database from 'better-sqlite3';

/** Populate the catalog tables with the fixed discovery inventory without creating duplicates. */
export function ensureSeeded(database: Database.Database): void {
  const seed = database.transaction(() => {
    const insertMovie = database.prepare('INSERT OR IGNORE INTO movies (id, title) VALUES (?, ?)');
    insertMovie.run('mov_paradise', 'Paradise');
    insertMovie.run('mov_bloody_romeo', 'Bloody Romeo');
    insertMovie.run('mov_og2', 'OG2');

    const insertTheatre = database.prepare('INSERT OR IGNORE INTO theatres (id, name) VALUES (?, ?)');
    insertTheatre.run('thr_sandhya', 'Sandhya 70mm');
    insertTheatre.run('thr_sudharsham', 'Sudharsham 70mm');
    insertTheatre.run('thr_allu', 'Allu Cinemas');

    const insertMapping = database.prepare('INSERT OR IGNORE INTO movie_theatres (movie_id, theatre_id) VALUES (?, ?)');
    insertMapping.run('mov_paradise', 'thr_sandhya');
    insertMapping.run('mov_bloody_romeo', 'thr_sudharsham');
    insertMapping.run('mov_og2', 'thr_allu');
  });
  seed();
}
