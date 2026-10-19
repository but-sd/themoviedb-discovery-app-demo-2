import { collectMovies } from './collectMovies';

try {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !/^\d{4}$/.test(args[0])) {
    throw new Error('Usage: npm run collect:movies -- <year>');
  }
  console.log(await collectMovies(Number(args[0])));
} catch (error) {
  console.error('Movie collection failed:', error);
  process.exitCode = 1;
}
