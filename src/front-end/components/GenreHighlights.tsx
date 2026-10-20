import { useEffect, useState } from 'react';
import type {
  CollectionSummary,
  GenreDistribution,
  GenreRating,
} from '../../back-end/schemas/MoviesTypes';
import { AverageRatingCard } from './AverageRatingCard/AverageRatingCard';
import { AverageRuntimeCard } from './AverageRuntimeCard/AverageRuntimeCard';
import { BestGenreRatingCard } from './BestGenreRatingCard/BestGenreRatingCard';
import { BestWeightedGenreRatingCard } from './BestWeightedGenreRatingCard/BestWeightedGenreRatingCard';
import { BestRatedMovieCard } from './BestRatedMovieCard/BestRatedMovieCard';
import { DominantGenreCard } from './DominantGenreCard/DominantGenreCard';
import { LeastProfitableMovieCard } from './LeastProfitableMovieCard/LeastProfitableMovieCard';
import { MostPopularMovieCard } from './MostPopularMovieCard/MostPopularMovieCard';
import { MostProfitableMovieCard } from './MostProfitableMovieCard/MostProfitableMovieCard';
import { MoviesInDatabaseCard } from './MoviesInDatabaseCard/MoviesInDatabaseCard';
import { RepresentedGenresCard } from './RepresentedGenresCard/RepresentedGenresCard';

export function GenreHighlightCards({
  distribution,
  ratings,
  summary,
}: {
  distribution: GenreDistribution[];
  ratings: GenreRating[];
  summary?: CollectionSummary | null;
}) {
  return (
    <section
      className="genre-highlights"
      aria-label="Vue d’ensemble du catalogue"
    >
      <section
        className="highlight-group highlight-group--genres"
        aria-label="Indicateurs des genres"
      >
        <header className="highlight-group-header">
          <span className="highlight-group-icon" aria-hidden="true">
            ◈
          </span>
          <div>
            <h2>Genres</h2>
            <p>Les tendances de votre catalogue</p>
          </div>
        </header>
        <div className="highlight-group-cards">
          <RepresentedGenresCard distribution={distribution} />
          <DominantGenreCard distribution={distribution} />
          <BestGenreRatingCard ratings={ratings} />
          <BestWeightedGenreRatingCard ratings={ratings} />
        </div>
      </section>
      {summary && (
        <section
          className="highlight-group highlight-group--movies"
          aria-label="Indicateurs des films"
        >
          <header className="highlight-group-header">
            <span className="highlight-group-icon" aria-hidden="true">
              ▤
            </span>
            <div>
              <h2>Votre catalogue en un coup d’œil</h2>
              <p>Les chiffres essentiels, tous films confondus</p>
            </div>
          </header>
          <div className="catalog-metrics">
            <MoviesInDatabaseCard
              movieCount={summary.movieCount}
              years={summary.years}
            />
            <AverageRuntimeCard averageRuntime={summary.averageRuntime} />
            <AverageRatingCard averageRating={summary.averageRating} />
          </div>
          <section
            className="featured-movies"
            aria-labelledby="featured-movies-title"
          >
            <header className="highlight-group-header">
              <div>
                <h2 id="featured-movies-title">Films à la une</h2>
                <p>Les films qui se distinguent dans votre catalogue</p>
              </div>
            </header>
            <div className="featured-movies-grid">
              <BestRatedMovieCard movie={summary.bestRatedMovie} />
              <MostPopularMovieCard movie={summary.mostPopularMovie} />
              <MostProfitableMovieCard movie={summary.mostProfitableMovie} />
              <LeastProfitableMovieCard movie={summary.leastProfitableMovie} />
            </div>
          </section>
        </section>
      )}
    </section>
  );
}

async function fetchHighlights(signal: AbortSignal) {
  const [distributionResponse, ratingsResponse] = await Promise.all([
    fetch('/api/movies/genres/distribution', { signal }),
    fetch('/api/movies/genres/ratings', { signal }),
  ]);
  if (!distributionResponse.ok || !ratingsResponse.ok) {
    throw new Error('Impossible de charger la synthèse des genres.');
  }
  const distribution: unknown = await distributionResponse.json();
  const ratings: unknown = await ratingsResponse.json();
  function isGenre(value: unknown): value is GenreDistribution {
    return (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      typeof value.id === 'number' &&
      Number.isSafeInteger(value.id) &&
      'name' in value &&
      typeof value.name === 'string' &&
      'movieCount' in value &&
      typeof value.movieCount === 'number' &&
      Number.isSafeInteger(value.movieCount) &&
      value.movieCount >= 0
    );
  }
  function isRating(value: unknown): value is GenreRating {
    return (
      isGenre(value) &&
      'averageRating' in value &&
      typeof value.averageRating === 'number' &&
      Number.isFinite(value.averageRating) &&
      value.averageRating >= 0 &&
      value.averageRating <= 10 &&
      'weightedAverageRating' in value &&
      typeof value.weightedAverageRating === 'number' &&
      Number.isFinite(value.weightedAverageRating) &&
      value.weightedAverageRating >= 0 &&
      value.weightedAverageRating <= 10 &&
      'voteCount' in value &&
      typeof value.voteCount === 'number' &&
      Number.isSafeInteger(value.voteCount) &&
      value.voteCount >= 0
    );
  }
  if (
    !Array.isArray(distribution) ||
    !distribution.every(isGenre) ||
    !Array.isArray(ratings) ||
    !ratings.every(isRating)
  ) {
    throw new Error('La synthèse des genres est invalide.');
  }
  return { distribution, ratings };
}

export default function GenreHighlights({
  revision,
  summary,
}: {
  revision: unknown;
  summary?: CollectionSummary | null;
}) {
  const [data, setData] = useState<{
    distribution: GenreDistribution[];
    ratings: GenreRating[];
  } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetchHighlights(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setError('');
        }
      })
      .catch((fetchError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'Impossible de charger la synthèse des genres.',
          );
        }
      });
    return () => controller.abort();
  }, [revision]);

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Chargement de la synthèse des genres…</p>;
  return (
    <GenreHighlightCards
      distribution={data.distribution}
      ratings={data.ratings}
      summary={summary}
    />
  );
}
