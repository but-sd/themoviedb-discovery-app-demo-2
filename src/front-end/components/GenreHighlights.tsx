import { useEffect, useState } from 'react';
import type {
  CollectionSummary,
  GenreDistribution,
  GenreRating,
} from '../../back-end/schemas/MoviesTypes';

export function GenreHighlightCards({
  distribution,
  ratings,
  summary,
}: {
  distribution: GenreDistribution[];
  ratings: GenreRating[];
  summary?: CollectionSummary | null;
}) {
  const maxCount = Math.max(...distribution.map((genre) => genre.movieCount));
  const maxRating = Math.max(...ratings.map((genre) => genre.averageRating));
  const maxWeightedRating = Math.max(
    ...ratings.map((genre) => genre.weightedAverageRating),
  );
  const highestWeightedRated = ratings.filter(
    (genre) => genre.weightedAverageRating === maxWeightedRating,
  );
  const mostRepresented = distribution.filter(
    (genre) => genre.movieCount === maxCount,
  );
  const highestRated = ratings.filter(
    (genre) => genre.averageRating === maxRating,
  );

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
          <details className="genre-highlight">
            <summary>
              <span className="genre-highlight-label">
                Genres représentés <span aria-hidden="true">↗</span>
              </span>
              <p className="genre-highlight-name">Diversité du catalogue</p>
              <p className="genre-highlight-value">
                {distribution.length.toLocaleString('fr-FR')}{' '}
                <span>genres</span>
              </p>
            </summary>
            <div className="genre-highlight-tooltip">
              <strong>Genres représentés en base</strong>
              <p>
                Nombre de genres distincts associés à au moins un film
                enregistré.
              </p>
              <p>
                {distribution.length
                  ? distribution.map((genre) => genre.name).join(', ')
                  : 'Aucun genre disponible.'}
              </p>
            </div>
          </details>
          <details className="genre-highlight">
            <summary>
              <span className="genre-highlight-label">
                Genre dominant <span aria-hidden="true">↗</span>
              </span>
              {mostRepresented.length ? (
                <>
                  <p className="genre-highlight-name">
                    {mostRepresented[0].name}
                    {mostRepresented.length > 1 && (
                      <span className="genre-highlight-badge">
                        +{mostRepresented.length - 1}
                      </span>
                    )}
                  </p>
                  <p className="genre-highlight-value">
                    {maxCount.toLocaleString('fr-FR')} <span>films</span>
                  </p>
                </>
              ) : (
                <p>Aucun genre disponible.</p>
              )}
            </summary>
            <div className="genre-highlight-tooltip">
              <strong>Genre le plus représenté</strong>
              <p>
                Nombre de films en base associés à ce genre. Un film peut
                appartenir à plusieurs genres.
              </p>
              {mostRepresented.length > 1 && (
                <p>
                  Genres ex æquo :{' '}
                  {mostRepresented.map((genre) => genre.name).join(', ')}.
                </p>
              )}
            </div>
          </details>
          <details className="genre-highlight genre-highlight--rating">
            <summary>
              <span className="genre-highlight-label">
                Meilleure note <span aria-hidden="true">☆</span>
              </span>
              {highestRated.length ? (
                <>
                  <p className="genre-highlight-name">
                    {highestRated[0].name}
                    {highestRated.length > 1 && (
                      <span className="genre-highlight-badge">
                        +{highestRated.length - 1}
                      </span>
                    )}
                  </p>
                  <p className="genre-highlight-value">
                    {maxRating.toLocaleString('fr-FR', {
                      maximumFractionDigits: 2,
                    })}{' '}
                    <span>/ 10</span>
                  </p>
                </>
              ) : (
                <p>Aucun film noté disponible.</p>
              )}
            </summary>
            <div className="genre-highlight-tooltip">
              <strong>Genre avec la meilleure moyenne</strong>
              <p>Films ayant au moins un vote, moyenne non pondérée.</p>
              {highestRated.map((genre) => (
                <p key={genre.id}>
                  {genre.name} : {genre.movieCount.toLocaleString('fr-FR')}{' '}
                  films notés · {genre.voteCount.toLocaleString('fr-FR')} votes.
                </p>
              ))}
              {highestRated.length > 1 && (
                <p>
                  Genres ex æquo :{' '}
                  {highestRated.map((genre) => genre.name).join(', ')}.
                </p>
              )}
            </div>
          </details>
          <details className="genre-highlight genre-highlight--rating">
            <summary>
              <span className="genre-highlight-label">
                Meilleure note pondérée <span aria-hidden="true">☆</span>
              </span>
              {highestWeightedRated.length ? (
                <>
                  <p className="genre-highlight-name">
                    {highestWeightedRated[0].name}
                    {highestWeightedRated.length > 1 && (
                      <span className="genre-highlight-badge">
                        +{highestWeightedRated.length - 1}
                      </span>
                    )}
                  </p>
                  <p className="genre-highlight-value">
                    {maxWeightedRating.toLocaleString('fr-FR', {
                      maximumFractionDigits: 2,
                    })}{' '}
                    <span>/ 10</span>
                  </p>
                </>
              ) : (
                <p>Aucun film noté disponible.</p>
              )}
            </summary>
            <div className="genre-highlight-tooltip">
              <strong>Genre avec la meilleure moyenne pondérée</strong>
              <p>
                Somme des notes multipliées par le nombre de votes, divisée par
                le total des votes. Les films sans vote sont exclus.
              </p>
              {highestWeightedRated.map((genre) => (
                <p key={genre.id}>
                  {genre.name} : {genre.movieCount.toLocaleString('fr-FR')}{' '}
                  films notés · {genre.voteCount.toLocaleString('fr-FR')} votes.
                </p>
              ))}
              {highestWeightedRated.length > 1 && (
                <p>
                  Genres ex æquo :{' '}
                  {highestWeightedRated.map((genre) => genre.name).join(', ')}.
                </p>
              )}
            </div>
          </details>
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
            <details className="genre-highlight">
              <summary>
                <span className="genre-highlight-label">
                  Films en base <span aria-hidden="true">↗</span>
                </span>
                <p className="genre-highlight-value">
                  {summary.movieCount.toLocaleString('fr-FR')}{' '}
                  <span>films</span>
                </p>
                <p className="genre-highlight-period">
                  {summary.years.length
                    ? `${Math.min(...summary.years)} – ${Math.max(...summary.years)}`
                    : 'Aucune année collectée'}
                </p>
              </summary>
              <div className="genre-highlight-tooltip">
                <strong>Films enregistrés dans la base</strong>
                <p>Nombre de films distincts, tous genres confondus.</p>
                {summary.years.length > 0 && (
                  <>
                    <p>Année de début : {Math.min(...summary.years)}.</p>
                    <p>Année de fin : {Math.max(...summary.years)}.</p>
                    <p>Années déjà collectées : {summary.years.join(', ')}.</p>
                  </>
                )}
              </div>
            </details>
            <details className="genre-highlight">
              <summary>
                <span className="genre-highlight-label">
                  Durée moyenne <span aria-hidden="true">↗</span>
                </span>
                <p className="genre-highlight-value">
                  {summary.averageRuntime != null ? (
                    <>
                      {Math.round(summary.averageRuntime).toLocaleString(
                        'fr-FR',
                      )}{' '}
                      <span>min</span>
                    </>
                  ) : (
                    <span>Non disponible</span>
                  )}
                </p>
              </summary>
              <div className="genre-highlight-tooltip">
                <strong>Durée moyenne d’un film</strong>
                <p>
                  Moyenne calculée sur {summary.runtimeMovieCount ?? 0} films
                  ayant une durée connue. Les durées absentes ou nulles sont
                  exclues.
                </p>
                <p>
                  Mettez à jour la collecte depuis l’administration pour
                  renseigner les durées manquantes.
                </p>
              </div>
            </details>
            <details className="genre-highlight">
              <summary>
                <span className="genre-highlight-label">
                  Note moyenne <span aria-hidden="true">☆</span>
                </span>
                <p className="genre-highlight-value">
                  {summary.averageRating != null ? (
                    <>
                      {summary.averageRating.toLocaleString('fr-FR', {
                        maximumFractionDigits: 2,
                      })}{' '}
                      <span>/ 10</span>
                    </>
                  ) : (
                    <span>Non disponible</span>
                  )}
                </p>
              </summary>
              <div className="genre-highlight-tooltip">
                <strong>Note moyenne d’un film</strong>
                <p>
                  Moyenne arithmétique sur {summary.ratedMovieCount ?? 0} films
                  ayant au moins un vote, sans pondération par le nombre de
                  votes. Chaque film est compté une seule fois, tous genres
                  confondus.
                </p>
              </div>
            </details>
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
              {[
                {
                  label: 'Film le mieux noté',
                  movie: summary.bestRatedMovie,
                  rating: true,
                  financial: null,
                  profitability: false,
                },
                {
                  label: 'Film le plus populaire',
                  movie: summary.mostPopularMovie,
                  rating: false,
                  financial: null,
                  profitability: false,
                },
                {
                  label: 'Film le plus rentable',
                  movie: summary.mostProfitableMovie,
                  rating: false,
                  financial: summary.mostProfitableMovie ?? null,
                  profitability: true,
                },
                {
                  label: 'Film le moins rentable',
                  movie: summary.leastProfitableMovie,
                  rating: false,
                  financial: summary.leastProfitableMovie ?? null,
                  profitability: true,
                },
              ].map(({ label, movie, rating, financial, profitability }) => (
                <details className="genre-highlight featured-movie" key={label}>
                  <summary>
                    {movie?.posterPath ? (
                      <>
                        <img
                          className="featured-movie-poster"
                          src={`https://image.tmdb.org/t/p/w185${movie.posterPath}`}
                          alt=""
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.hidden = true;
                          }}
                        />
                        <span
                          className="featured-movie-placeholder featured-movie-image-fallback"
                          aria-hidden="true"
                        >
                          ▤
                        </span>
                      </>
                    ) : (
                      <span
                        className="featured-movie-placeholder"
                        aria-hidden="true"
                      >
                        ▤
                      </span>
                    )}
                    <div className="featured-movie-content">
                      <span className="genre-highlight-label">
                        {label}
                        <span aria-hidden="true">↗</span>
                      </span>
                      {movie ? (
                        <>
                          <p className="genre-highlight-name">{movie.title}</p>
                          <p className="featured-movie-year">{movie.year}</p>
                          <p className="genre-highlight-value">
                            {(financial
                              ? financial.returnOnInvestment
                              : rating
                                ? movie.rating
                                : movie.popularity
                            ).toLocaleString('fr-FR', {
                              maximumFractionDigits: 2,
                            })}{' '}
                            <span>
                              {financial
                                ? '% ROI'
                                : rating
                                  ? '/ 10'
                                  : 'popularité'}
                            </span>
                          </p>
                        </>
                      ) : (
                        <p>
                          {profitability
                            ? 'Aucun film avec budget et recettes connus.'
                            : rating
                              ? 'Aucun film avec au moins 100 votes.'
                              : 'Aucun film disponible.'}
                        </p>
                      )}
                    </div>
                  </summary>
                  <div className="genre-highlight-tooltip">
                    <strong>{label}</strong>
                    <p>
                      {profitability
                        ? 'Retour sur investissement : (recettes − budget) / budget × 100. Seuls les budgets et recettes connus et positifs sont inclus. En cas d’égalité, l’identifiant du film départage les films. Cet indicateur ne tient pas compte du marketing, des frais de distribution ni du partage des recettes.'
                        : rating
                          ? 'Classement des films ayant au moins 100 votes. En cas d’égalité, le nombre de votes départage les films.'
                          : 'Score de popularité TMDB observé lors de la collecte, et non lors de la sortie du film. En cas d’égalité, le nombre de votes départage les films.'}
                    </p>
                    {financial && (
                      <p>
                        Budget :{' '}
                        {financial.budget.toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 0,
                        })}{' '}
                        · Recettes :{' '}
                        {financial.revenue.toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 0,
                        })}
                        .
                      </p>
                    )}
                    {movie && (
                      <p>
                        {movie.year} · Note :{' '}
                        {movie.rating.toLocaleString('fr-FR')} / 10 ·{' '}
                        {movie.voteCount.toLocaleString('fr-FR')} votes.
                      </p>
                    )}
                  </div>
                </details>
              ))}
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
