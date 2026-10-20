import type { Meta, StoryObj } from '@storybook/react-vite';
import { BestGenreRatingCard } from './BestGenreRatingCard';

const meta = {
  title: 'Genres/Meilleure note',
  component: BestGenreRatingCard,
  args: {
    ratings: [
      {
        id: 12,
        name: 'Aventure',
        movieCount: 120,
        averageRating: 8.25,
        weightedAverageRating: 7.5,
        voteCount: 5000,
      },
      {
        id: 18,
        name: 'Drame',
        movieCount: 240,
        averageRating: 7,
        weightedAverageRating: 8,
        voteCount: 10000,
      },
    ],
  },
} satisfies Meta<typeof BestGenreRatingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { ratings: [] } };
export const Tied: Story = {
  args: {
    ratings: meta.args.ratings.map((genre) => ({
      ...genre,
      averageRating: 8.25,
    })),
  },
};
