import { collectMovies } from './collectMovies';

try {
  const args = process.argv.slice(2);
  if (
    args.length < 1 ||
    args.length > 2 ||
    !/^\d{4}$/.test(args[0]) ||
    (args[1] !== undefined && !/^\d+$/.test(args[1]))
  ) {
    throw new Error('Usage: npm run collect:movies -- <year> [count]');
  }
  console.log(
    await collectMovies(
      Number(args[0]),
      args[1] === undefined ? undefined : Number(args[1]),
    ),
  );
} catch (error) {
  console.error('Movie collection failed:', error);
  process.exitCode = 1;
}
