import type { Meta, StoryObj } from '@storybook/react-vite';
import { genres, movieHighlight } from '../stories/fixtures';
import { GenreHighlightCards } from './GenreHighlights';

const meta = {
  component: GenreHighlightCards,
  args: {
    distribution: genres,
    ratings: genres,
    summary: {
      movieCount: 1234,
      years: [2020, 2022, 2026],
      averageRuntime: 112.6,
      averageRating: 7.25,
      topProductionCountry: { code: 'FR', name: 'France', movieCount: 450 },
      bestRatedMovie: movieHighlight,
      mostPopularMovie: movieHighlight,
      mostProfitableMovie: movieHighlight,
      leastProfitableMovie: {
        ...movieHighlight,
        id: 2,
        title: 'Un autre voyage',
        revenue: 250000,
        returnOnInvestment: -75,
      },
    },
  },
} satisfies Meta<typeof GenreHighlightCards>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = {
  args: {
    distribution: [],
    ratings: [],
    summary: { movieCount: 0, years: [] },
  },
};
