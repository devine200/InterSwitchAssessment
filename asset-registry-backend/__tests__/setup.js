import { beforeAll, afterEach, afterAll } from '@jest/globals';
import { TestAsset, TestTransfer, testSequelize } from './testDb.js';

// Setup test database before all tests
beforeAll(async () => {
  await testSequelize.sync({ force: true });
});

// Clean up after each test
afterEach(async () => {
  await TestTransfer.destroy({ where: {}, truncate: true });
  await TestAsset.destroy({ where: {}, truncate: true });
});

// Close database connection after all tests
afterAll(async () => {
  await testSequelize.close();
});

