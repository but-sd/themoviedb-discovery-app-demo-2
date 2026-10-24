import type { Meta, StoryObj } from '@storybook/react-vite';
import MovieCountryDistributionChart from './MovieCountryDistributionChart';

const meta = {
  component: MovieCountryDistributionChart,
  args: {
    data: {
      countries: [
        { code: 'US', name: 'United States of America', movieCount: 250 },
        { code: 'FR', name: 'France', movieCount: 150 },
        { code: 'BE', name: 'Belgium', movieCount: 75 },
      ],
      unknownMovieCount: 12,
    },
  },
} satisfies Meta<typeof MovieCountryDistributionChart>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = {
  args: { data: { countries: [], unknownMovieCount: 0 } },
};
export const UnknownOnly: Story = {
  args: { data: { countries: [], unknownMovieCount: 20 } },
};
