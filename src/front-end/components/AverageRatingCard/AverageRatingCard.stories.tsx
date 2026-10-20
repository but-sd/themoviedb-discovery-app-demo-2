import type { Meta, StoryObj } from '@storybook/react-vite';
import { AverageRatingCard } from './AverageRatingCard';

const meta = {
  title: 'Catalogue/Note moyenne',
  component: AverageRatingCard,
  args: { averageRating: 7.256 },
} satisfies Meta<typeof AverageRatingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Unavailable: Story = { args: { averageRating: null } };
export const Zero: Story = { args: { averageRating: 0 } };
