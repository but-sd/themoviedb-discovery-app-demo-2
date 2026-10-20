import type { Meta, StoryObj } from '@storybook/react-vite';
import { TopProductionCountryCard } from './TopProductionCountryCard';

const meta = {
  component: TopProductionCountryCard,
  args: { country: { code: 'FR', name: 'France', movieCount: 1234 } },
} satisfies Meta<typeof TopProductionCountryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { country: null } };
