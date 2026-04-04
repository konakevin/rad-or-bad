module.exports = {
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@engine/(.*)$': '<rootDir>/supabase/functions/_shared/$1',
    // Map Deno-style .ts imports used by _shared files
    '^\\.\\./vibeProfile\\.ts$': '<rootDir>/types/vibeProfile',
    '^\\.\\./recipe\\.ts$': '<rootDir>/types/recipe',
    '^\\./vibeProfile\\.ts$': '<rootDir>/types/vibeProfile',
    '^\\./recipe\\.ts$': '<rootDir>/types/recipe',
  },
  globals: {
    __DEV__: true,
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', { caller: { name: 'metro' } }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|nativewind)',
  ],
};
