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

// Stories for MoviesInDatabaseCardView component

// Default story shows the component with typical data
export const Default: Story = {};

// Empty story shows the component with no movies and no years
export const Empty: Story = {
  args: { state: { status: 'success', data: { movieCount: 0, years: [] } } },
};

// Loading story shows the component while data is being fetched
export const Loading: Story = { args: { state: { status: 'loading' } } };

// ErrorState story shows the component when there is an error
export const ErrorState: Story = {
  args: {
    state: {
      status: 'error',
      message: 'Chargement impossible.',
    },
  },
};
