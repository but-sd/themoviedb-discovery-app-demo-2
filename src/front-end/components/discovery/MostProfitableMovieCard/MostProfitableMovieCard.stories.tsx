import type { Meta, StoryObj } from '@storybook/react-vite';
import { movieHighlight } from '../../../stories/fixtures';
import { MostProfitableMovieCard } from './MostProfitableMovieCard';

const meta = {
  component: MostProfitableMovieCard,
  args: { movie: movieHighlight },
} satisfies Meta<typeof MostProfitableMovieCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { movie: null } };
