// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import type { Movie } from '../../../back-end/schemas/MoviesTypes';
import MovieItem from './MovieItem';

afterEach(cleanup);

const movie = {
  id: 123,
  title: 'Example Movie',
  release_date: '2024-05-10',
  vote_average: 7.456,
  poster_path: '/example-poster.jpg',
} as Movie;

function renderMovie() {
  return render(
    <MemoryRouter>
      <MovieItem movie={movie} />
    </MemoryRouter>,
  );
}

describe('MovieItem posterUrl', () => {
  it('should render the MovieItem component', () => {
    renderMovie();

    // Assert

    // Check that the movie as poster image is rendered.
    const moviePoster = screen.getByRole('img');
    expect(moviePoster).not.toBeNull();
    expect(moviePoster.getAttribute('src')).toBe(
      'https://image.tmdb.org/t/p/w185/example-poster.jpg',
    );

    // Check that the movie title is rendered and h2 element
    const movieTitle = screen.queryByText(movie.title);
    expect(movieTitle).not.toBeNull();
    expect(movieTitle?.tagName).toBe('H2');

    // Check that the movie link has the correct href attribute.
    const movieLink = screen.getByRole('link');
    expect(movieLink.getAttribute('href')).toBe(`/movies/${movie.id}`);

    // Check that the movie release date is rendered and p element
    const movieReleaseDate = screen.queryByText(
      new RegExp(movie.release_date.slice(0, 4)),
    );
    expect(movieReleaseDate).not.toBeNull();
    expect(movieReleaseDate?.tagName).toBe('P');

    // Check that the movie vote average is rendered and p element
    const movieVoteAverage = screen.queryByText(
      new RegExp(movie.vote_average.toFixed(1)),
    );
    expect(movieVoteAverage).not.toBeNull();
    expect(movieVoteAverage?.tagName).toBe('P');
  });
});
