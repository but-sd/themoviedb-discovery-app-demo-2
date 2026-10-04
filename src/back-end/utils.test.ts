import { describe, expect, it } from 'vitest';
import { toSupportedMovie } from './utils';
import type { TmdbMovie } from './schemas/MoviesTypes';

// Mock TMDB movie object for testing.
const mockTmdbMovie: TmdbMovie = {
  adult: false,
  backdrop_path: '/path/to/backdrop.jpg',
  genre_ids: [28, 12],
  id: 12345,
  original_language: 'en',
  original_title: 'Original Title',
  overview: 'This is an overview.',
  popularity: 123.45,
  poster_path: '/path/to/poster.jpg',
  release_date: '2023-01-01',
  title: 'Title',
  video: false,
  vote_average: 7.8,
  vote_count: 1234,
};

describe('utils', () => {
  it('should convert TMDB movies raw response to supported movie format', () => {
    // Arrange: Prepare the mock TMDB movies raw response.

    // Act: Convert the first movie in the raw response to the supported movie format.
    const result = toSupportedMovie(mockTmdbMovie);

    // Assert: Verify that the conversion result is defined and has the expected ID.
    expect(result).toBeDefined();
    expect(result.id).toBe(mockTmdbMovie.id);

    // Assert: Prepare the expected movie object by omitting the 'adult' and 'video' properties.
    const {
      adult: _adult, // Omit the 'adult' property from the expected movie object.
      video: _video, // Omit the 'video' property from the expected movie object.
      ...expectedMovie
    } = mockTmdbMovie;

    expect(result).toEqual(expectedMovie);
  });
});
