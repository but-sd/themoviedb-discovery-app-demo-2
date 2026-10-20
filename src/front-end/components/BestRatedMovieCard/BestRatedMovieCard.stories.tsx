import type { Meta, StoryObj } from '@storybook/react-vite';
import { movieHighlight } from '../../stories/fixtures';
import { BestRatedMovieCard } from './BestRatedMovieCard';

const meta = {
  title: 'Films/Film le mieux noté',
  component: BestRatedMovieCard,
  args: { movie: movieHighlight },
} satisfies Meta<typeof BestRatedMovieCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { movie: null } };
export const LongTitle: Story = {
  args: {
    movie: {
      ...movieHighlight,
      title:
        'Le voyage extraordinaire à travers les mondes oubliés et les galaxies lointaines',
    },
  },
};
