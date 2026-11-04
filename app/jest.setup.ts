/* eslint-env jest */
// Native modules Jest can't load: use their official mocks.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
