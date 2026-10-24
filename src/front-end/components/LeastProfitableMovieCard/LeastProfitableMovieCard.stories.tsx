import type { Meta, StoryObj } from '@storybook/react-vite';
import { LeastProfitableMovieCard } from './LeastProfitableMovieCard';
import { movieHighlight } from '../../stories/fixtures';

const meta = {
  component: LeastProfitableMovieCard,
  args: {
    movie: { ...movieHighlight, revenue: 250000, returnOnInvestment: -75 },
  },
} satisfies Meta<typeof LeastProfitableMovieCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { movie: null } };
