import { useEffect, useState } from 'react';
import DistributionChartVisualization from './DistributionChartVisualization';
import type {
  GenreDistribution,
  GenreRating,
} from '../../back-end/schemas/MoviesTypes';

export default function GenreDistributionChart({
  revision,
  metric = 'count',
}: {
  revision: unknown;
  metric?: 'count' | 'rating' | 'weightedRating';
}) {
  const [data, setData] = useState<
    (GenreDistribution & Partial<GenreRating>)[] | null
  >(null);
  const [error, setError] = useState('');
  const isWeighted = metric === 'weightedRating';
  const isRating = metric !== 'count';
  const title = isWeighted
    ? 'Notes moyennes pondérées par genre'
    : isRating
      ? 'Notes moyennes par genre'
      : 'Répartition des films par genre';
  const titleId = isWeighted
    ? 'genre-weighted-rating-title'
    : isRating
      ? 'genre-rating-title'
      : 'genre-chart-title';

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/movies/genres/${isRating ? 'ratings' : 'distribution'}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Impossible de charger : ${title}.`);
        const result: unknown = await response.json();
        if (
          !Array.isArray(result) ||
          !result.every(
            (row: unknown) =>
              typeof row === 'object' &&
              row !== null &&
              'id' in row &&
              typeof row.id === 'number' &&
              'name' in row &&
              typeof row.name === 'string' &&
              'movieCount' in row &&
              typeof row.movieCount === 'number' &&
              Number.isSafeInteger(row.movieCount) &&
              row.movieCount >= 0 &&
              (!isRating ||
                ('averageRating' in row &&
                  typeof row.averageRating === 'number' &&
                  Number.isFinite(row.averageRating) &&
                  row.averageRating >= 0 &&
                  row.averageRating <= 10 &&
                  (!isWeighted ||
                    ('weightedAverageRating' in row &&
                      typeof row.weightedAverageRating === 'number' &&
                      Number.isFinite(row.weightedAverageRating) &&
                      row.weightedAverageRating >= 0 &&
                      row.weightedAverageRating <= 10)) &&
                  'voteCount' in row &&
                  typeof row.voteCount === 'number' &&
                  Number.isSafeInteger(row.voteCount) &&
                  row.voteCount >= 0)),
          )
        )
          throw new Error('Répartition par genre invalide.');
        if (!controller.signal.aborted) {
          setData(
            isRating
              ? result.toSorted(
                  (left, right) =>
                    (isWeighted
                      ? right.weightedAverageRating - left.weightedAverageRating
                      : right.averageRating - left.averageRating) ||
                    left.id - right.id,
                )
              : result,
          );
          setError('');
        }
      })
      .catch((fetchError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'Impossible de charger le graphique.',
          );
        }
      });
    return () => controller.abort();
  }, [revision, isRating, isWeighted, title]);

  return (
    <section className="genre-distribution" aria-labelledby={titleId}>
      <h2 id={titleId}>{title}</h2>
      <p>
        Tous les films en base. Un film peut être compté dans plusieurs genres.
      </p>
      {isRating && (
        <p>
          {isWeighted
            ? 'Moyenne des notes pondérée par le nombre de votes : somme(note × votes) / somme(votes). Seuls les films ayant au moins un vote sont inclus.'
            : 'Moyenne arithmétique des notes des films ayant au moins un vote, sans pondération par le nombre de votes.'}
        </p>
      )}
      <DistributionChartVisualization
        data={
          error
            ? null
            : (data?.map((genre) => ({
                label: genre.name,
                value: isWeighted
                  ? genre.weightedAverageRating!
                  : isRating
                    ? genre.averageRating!
                    : genre.movieCount,
              })) ?? null)
        }
        title={title}
        isRating={isRating}
        circularDescription="Les parts représentent les associations film/genre, pas des films distincts."
      />
      {error ? (
        <p role="alert">{error}</p>
      ) : data === null ? (
        <p role="status">Chargement du graphique…</p>
      ) : data.length === 0 ? (
        <p>
          Aucun genre à afficher. Lancez une collecte pour alimenter le
          graphique.
        </p>
      ) : (
        <>
          <details>
            <summary>Afficher les données du graphique</summary>
            <table>
              <caption>{title}</caption>
              <thead>
                <tr>
                  <th scope="col">Genre</th>
                  <th scope="col">Films</th>
                  {isRating && (
                    <>
                      <th scope="col">
                        {isWeighted
                          ? 'Note moyenne pondérée / 10'
                          : 'Note moyenne / 10'}
                      </th>
                      <th scope="col">Votes</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((genre) => (
                  <tr key={genre.id}>
                    <th scope="row">{genre.name}</th>
                    <td>{genre.movieCount}</td>
                    {isRating && (
                      <>
                        <td>
                          {(isWeighted
                            ? genre.weightedAverageRating
                            : genre.averageRating
                          )?.toLocaleString('fr-FR', {
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td>{genre.voteCount?.toLocaleString('fr-FR')}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}
