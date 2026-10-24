import type { Meta, StoryObj } from '@storybook/react-vite';
import { MOVIE_RATING_RANGES } from '../../back-end/schemas/MoviesTypes';
import MovieRatingDistributionCharts from './MovieRatingDistributionCharts';

const emptyBuckets = MOVIE_RATING_RANGES.map(({ label }) => ({
  label,
  movieCount: 0,
}));
const meta = {
  component: MovieRatingDistributionCharts,
  args: {
    data: {
      buckets: emptyBuckets.map((row) => ({ ...row, movieCount: 10 })),
      years: [
        { year: 2020, averageRating: 6.25, movieCount: 40 },
        { year: 2024, averageRating: 7.5, movieCount: 60 },
      ],
      unratedMovieCount: 12,
    },
  },
} satisfies Meta<typeof MovieRatingDistributionCharts>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = {
  args: { data: { buckets: emptyBuckets, years: [], unratedMovieCount: 0 } },
};
export const UnratedOnly: Story = {
  args: { data: { buckets: emptyBuckets, years: [], unratedMovieCount: 20 } },
};
