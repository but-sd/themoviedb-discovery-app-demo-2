import type { Meta, StoryObj } from '@storybook/react-vite';
import { MOVIE_RUNTIME_RANGES } from '../../back-end/schemas/MoviesTypes';
import MovieRuntimeDistributionChart from './MovieRuntimeDistributionChart';

const emptyBuckets = MOVIE_RUNTIME_RANGES.map(({ label }) => ({
  label,
  movieCount: 0,
}));
const meta = {
  component: MovieRuntimeDistributionChart,
  args: {
    data: {
      buckets: emptyBuckets.map((row, index) => ({
        ...row,
        movieCount: (index + 1) * 20,
      })),
      unknownMovieCount: 12,
    },
  },
} satisfies Meta<typeof MovieRuntimeDistributionChart>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = {
  args: { data: { buckets: emptyBuckets, unknownMovieCount: 0 } },
};
export const UnknownOnly: Story = {
  args: { data: { buckets: emptyBuckets, unknownMovieCount: 50 } },
};
