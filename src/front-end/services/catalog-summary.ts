import type { CatalogSummary } from '../../back-end/schemas/MoviesTypes';

/**
 * Fetches the summary of the movie catalog.
 * @param signal The AbortSignal to cancel the request if needed.
 * @returns A promise that resolves to the catalog summary.
 */
export async function fetchCatalogSummary(
  signal?: AbortSignal,
): Promise<CatalogSummary> {
  // Fetch the catalog summary from the API endpoint
  const response = await fetch('/api/movies/catalog-summary', { signal });

  // Check if the response is successful, otherwise throw an error
  if (!response.ok)
    throw new Error('Impossible de charger les informations du catalogue.');
  const data: CatalogSummary = await response.json();
  return {
    // Return the movie count and the sorted years

    movieCount: data.movieCount,
    // Sort the years in ascending order before returning
    years: data.years.toSorted((a, b) => a - b),
  };
}
