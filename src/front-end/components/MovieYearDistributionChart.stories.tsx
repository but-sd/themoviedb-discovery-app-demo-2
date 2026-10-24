import type { Meta, StoryObj } from '@storybook/react-vite';
import MovieYearDistributionChart from './MovieYearDistributionChart';

const meta = {
  component: MovieYearDistributionChart,
  args: {
    data: [
      { year: 2020, movieCount: 150 },
      { year: 2022, movieCount: 230 },
      { year: 2026, movieCount: 75 },
    ],
  },
} satisfies Meta<typeof MovieYearDistributionChart>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { data: [] } };
export const ManyYears: Story = {
  args: {
    data: Array.from({ length: 40 }, (_, index) => ({
      year: 1980 + index,
      movieCount: (index + 1) * 10,
    })),
  },
};
