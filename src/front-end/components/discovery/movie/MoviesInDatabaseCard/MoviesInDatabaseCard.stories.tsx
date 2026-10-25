import type { Meta, StoryObj } from '@storybook/react-vite';
import { MoviesInDatabaseCardView } from './MoviesInDatabaseCardView';

const meta = {
  component: MoviesInDatabaseCardView,
  args: {
    state: {
      status: 'success',
      data: { movieCount: 1234, years: [2020, 2022, 2026] },
    },
  },
} satisfies Meta<typeof MoviesInDatabaseCardView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = {
  args: { state: { status: 'success', data: { movieCount: 0, years: [] } } },
};
export const Loading: Story = { args: { state: { status: 'loading' } } };
export const Error: Story = {
  args: {
    state: {
      status: 'error',
      message: 'Chargement impossible.',
    },
  },
};
