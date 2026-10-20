import type { Meta, StoryObj } from '@storybook/react-vite';
import { movieDetails } from '../stories/fixtures';
import MovieDetailCard from './MovieDetailCard';

const meta = {
  title: 'Films/Fiche du film',
  component: MovieDetailCard,
  args: { movie: movieDetails },
} satisfies Meta<typeof MovieDetailCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Minimal: Story = {
  args: {
    movie: {
      ...movieDetails,
      tagline: null,
      genres: [],
      production_countries: [],
    },
  },
};
