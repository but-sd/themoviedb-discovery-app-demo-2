import type { Meta, StoryObj } from '@storybook/react-vite';
import { MostPopularMovieCard } from './MostPopularMovieCard';
import { movieHighlight } from '../../../../stories/fixtures';

const meta = {
  component: MostPopularMovieCard,
  args: { movie: movieHighlight },
} satisfies Meta<typeof MostPopularMovieCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { movie: null } };
