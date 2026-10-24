import type { Meta, StoryObj } from '@storybook/react-vite';
import { BestRatedMovieCard } from './BestRatedMovieCard';
import { movieHighlight } from '../../../../stories/fixtures';

const meta = {
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
