import type { Meta, StoryObj } from '@storybook/react-vite';
import { AverageRatingCard } from './AverageRatingCard';

const meta = {
  title: 'Catalogue/Note moyenne',
  component: AverageRatingCard,
  args: { averageRating: 7.256 },
} satisfies Meta<typeof AverageRatingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Histoire par défaut affichant la note moyenne.
export const Default: Story = {};

// Histoire affichant l'état où la note moyenne n'est pas disponible.
export const Unavailable: Story = { args: { averageRating: null } };
