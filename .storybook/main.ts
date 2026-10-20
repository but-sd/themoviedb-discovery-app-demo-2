import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    {
      directory: '../src/front-end/components',
      files: '**/*.stories.@(ts|tsx)',
    },
  ],
  addons: ['@storybook/addon-docs', '@storybook/addon-themes'],
  framework: '@storybook/react-vite',
  core: {
    disableTelemetry: true,
  },
};

export default config;
