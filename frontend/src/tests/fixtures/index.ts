// =============================================================================
// Test Fixtures Index - Production Ready
// =============================================================================
// Centralized export for all test fixtures

// Data fixtures
export * from './data';

// Component fixtures
export * from './components';

// Re-export everything for convenience
export { default as dataFixtures } from './data';
export { default as componentFixtures } from './components';

// Combined fixtures
export const fixtures = {
  // Data factories
  user: require('./data').userFactory,
  tradingSession: require('./data').tradingSessionFactory,
  position: require('./data').positionFactory,
  marketData: require('./data').marketDataFactory,
  orderBook: require('./data').orderBookFactory,
  trade: require('./data').tradeFactory,
  notification: require('./data').notificationFactory,
  analytics: require('./data').analyticsFactory,

  // Component utilities
  createTestStore: require('./components').createTestStore,
  TestWrapper: require('./components').TestWrapper,
  renderWithProviders: require('./components').renderWithProviders,
  componentFixtures: require('./components').componentFixtures,
  formFixtures: require('./components').formFixtures,
  eventFixtures: require('./components').eventFixtures,
  asyncFixtures: require('./components').asyncFixtures,
  testDataFixtures: require('./components').testDataFixtures
};

// Default export
export default fixtures;
