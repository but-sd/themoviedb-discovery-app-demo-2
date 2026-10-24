import type { Meta, StoryObj } from '@storybook/react-vite';
import { DominantGenreCard } from './DominantGenreCard';

const meta = {
  component: DominantGenreCard,
  args: {
    distribution: [
      { id: 12, name: 'Aventure', movieCount: 120 },
      { id: 18, name: 'Drame', movieCount: 240 },
    ],
  },
} satisfies Meta<typeof DominantGenreCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { distribution: [] } };
export const Tied: Story = {
  args: {
    distribution: meta.args.distribution.map((genre) => ({
      ...genre,
      movieCount: 240,
    })),
  },
};
