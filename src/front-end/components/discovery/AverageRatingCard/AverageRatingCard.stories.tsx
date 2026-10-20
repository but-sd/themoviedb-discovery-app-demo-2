import type { Meta, StoryObj } from '@storybook/react-vite';
import { AverageRatingCard } from './AverageRatingCard';

const meta = {
  component: AverageRatingCard,
  args: { averageRating: 7.256 },
} satisfies Meta<typeof AverageRatingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Histoire par défaut affichant la note moyenne.
export const Default: Story = {};

// Histoire affichant l'état où la note moyenne n'est pas disponible.
export const Unavailable: Story = { args: { averageRating: null } };

// Histoire affichant la note moyenne avec une décimale lorsque la valeur le permet.
export const OneDecimal: Story = { args: { averageRating: 7.2 } };
