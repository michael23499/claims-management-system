const presets = require('jest-preset-angular/presets');

const presetConfig = presets.createCjsPreset({
  tsconfig: 'tsconfig.spec.json',
});

/** @type {import('jest').Config} */
module.exports = {
  ...presetConfig,
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.spec.ts',
    '!src/app/app.config.ts',
    '!src/app/app.routes.ts',
  ],
};
