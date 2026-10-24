import type { Meta, StoryObj } from '@storybook/react-vite';
import { MoviesInDatabaseCard } from './MoviesInDatabaseCard';

const meta = {
  component: MoviesInDatabaseCard,
  args: { movieCount: 1234, years: [2020, 2022, 2026] },
} satisfies Meta<typeof MoviesInDatabaseCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { movieCount: 0, years: [] } };
