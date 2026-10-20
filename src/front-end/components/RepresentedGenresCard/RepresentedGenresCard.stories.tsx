import type { Meta, StoryObj } from '@storybook/react-vite';
import { RepresentedGenresCard } from './RepresentedGenresCard';

const meta = {
  title: 'Genres/Genres représentés',
  component: RepresentedGenresCard,
  args: {
    distribution: [
      { id: 12, name: 'Aventure', movieCount: 120 },
      { id: 18, name: 'Drame', movieCount: 240 },
    ],
  },
} satisfies Meta<typeof RepresentedGenresCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { distribution: [] } };
