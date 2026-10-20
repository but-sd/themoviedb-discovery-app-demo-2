import type { Meta, StoryObj } from '@storybook/react-vite';
import { movieHighlight } from '../../stories/fixtures';
import { LeastProfitableMovieCard } from './LeastProfitableMovieCard';

const meta = {
  title: 'Films/Film le moins rentable',
  component: LeastProfitableMovieCard,
  args: {
    movie: { ...movieHighlight, revenue: 250000, returnOnInvestment: -75 },
  },
} satisfies Meta<typeof LeastProfitableMovieCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { movie: null } };
