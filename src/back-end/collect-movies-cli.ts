import { Command, InvalidArgumentError } from 'commander';
import { pathToFileURL } from 'node:url';
import { collectMovies } from './collectMovies';
import { isValidMovieYear } from './discover-movies';

/**
 * Parse a string as a four-digit year.
 * @param value The string value to parse as a year
 * @returns The parsed year as a number
 */
function parseYear(value: string): number {
  if (!isValidMovieYear(value)) {
    throw new InvalidArgumentError(
      `year must be a four-digit year between 1870 and ${new Date().getFullYear()}`,
    );
  }
  return Number(value);
}

/**
 * Parse a string as a positive integer count.
 * @param value The string value to parse as a count
 * @returns The parsed count as a number
 */
function parseCount(value: string): number {
  const count = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(count) || count <= 0) {
    throw new InvalidArgumentError('count must be a positive integer');
  }
  return count;
}

export function createCollectionCommand(): Command {
  return new Command()
    .name('collect:movies')
    .description(
      'Collect movies for one release year or an inclusive year range.',
    )
    .argument(
      '<year>',
      'four-digit release year, or start year of the range',
      parseYear,
    )
    .argument(
      '[count]',
      'maximum number of movies to collect per year',
      parseCount,
      100,
    )
    .option(
      '--end-year <year>',
      'last release year of the range (inclusive)',
      parseYear,
    )
    .showHelpAfterError('(add --help for additional information)')
    .action(
      async (year: number, count: number, options: { endYear?: number }) => {
        const endYear = options.endYear ?? year;
        if (endYear < year) {
          throw new InvalidArgumentError(
            'end year must be greater than or equal to start year',
          );
        }
        let total = 0;
        let nextYear = year;
        const errors: Error[] = [];
        async function collectNextYears() {
          while (nextYear <= endYear && errors.length === 0) {
            const currentYear = nextYear++;
            console.log(`Collecting movies for ${currentYear}…`);
            try {
              const result = await collectMovies(currentYear, count);
              total += result.collected;
              console.log(result);
            } catch (error) {
              errors.push(
                new Error(
                  `Collection failed for ${currentYear}. Previously saved years are preserved. ${
                    error instanceof Error ? error.message : String(error)
                  }`,
                  { cause: error },
                ),
              );
            }
          }
        }
        await Promise.all(
          Array.from({ length: Math.min(3, endYear - year + 1) }, () =>
            collectNextYears(),
          ),
        );
        if (errors.length > 0) {
          throw new AggregateError(
            errors,
            errors.map((error) => error.message).join('\n'),
          );
        }
        console.log(
          `Collection complete: ${total} movies across ${endYear - year + 1} year(s).`,
        );
      },
    );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await createCollectionCommand().parseAsync(process.argv);
  } catch (error) {
    console.error(
      'Movie collection failed:',
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  }
}
