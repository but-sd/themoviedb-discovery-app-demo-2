import type { Meta, StoryObj } from '@storybook/react-vite';
import { AverageRuntimeCard } from './AverageRuntimeCard';

const meta = {
  title: 'Catalogue/Durée moyenne',
  component: AverageRuntimeCard,
  args: { averageRuntime: 112.6 },
} satisfies Meta<typeof AverageRuntimeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Unavailable: Story = { args: { averageRuntime: null } };
