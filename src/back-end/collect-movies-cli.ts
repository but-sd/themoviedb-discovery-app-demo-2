import { Command, InvalidArgumentError } from 'commander';
import { collectMovies } from './collectMovies';

/**
 * Parse a string as a four-digit year.
 * @param value The string value to parse as a year
 * @returns The parsed year as a number
 */
function parseYear(value: string): number {
  if (!/^\d{4}$/.test(value)) {
    throw new InvalidArgumentError('year must be a four-digit year');
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

// CLI program for collecting movies
const program = new Command();
program
  .name('collect:movies')
  .description('Collect movies for a release year.')
  .argument('<year>', 'four-digit release year', parseYear)
  .argument('[count]', 'maximum number of movies to collect', parseCount)
  .showHelpAfterError('(add --help for additional information)')
  .action(async (year: number, count?: number) => {
    console.log(await collectMovies(year, count));
  });

try {
  await program.parseAsync(process.argv);
} catch (error) {
  console.error(
    'Movie collection failed:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
}
