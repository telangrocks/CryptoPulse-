# Contributing to CryptoPulse Trading Bot

Thank you for your interest in contributing to CryptoPulse! This document provides guidelines and information for contributors.

## 🤝 Code of Conduct

We are committed to providing a welcoming and inclusive experience for everyone. Please read and follow our Code of Conduct.

## 🚀 Getting Started

### Prerequisites
- Node.js v20 or higher
- pnpm v9 or higher
- Git
- Basic knowledge of TypeScript/JavaScript

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/cryptopulse-trading-bot.git
   cd cryptopulse-trading-bot
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp env-templates/backend.env backend/.env
   cp env-templates/frontend.env frontend/.env
   # Edit the .env files with your configuration
   ```

4. **Start development servers**
   ```bash
   pnpm dev
   ```

## 📝 Development Workflow

### Branching Strategy
- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Critical production fixes

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   # Run all tests
   pnpm test
   
   # Run linting
   pnpm lint
   
   # Run type checking
   pnpm typecheck
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new trading strategy"
   ```

5. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📋 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Commit Types
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Examples
```bash
feat: add support for Binance Futures API
fix: resolve WebSocket connection timeout issue
docs: update API documentation
style: format code with prettier
refactor: optimize trading strategy calculations
test: add unit tests for risk management
chore: update dependencies
```

## 🧪 Testing

### Test Types
- **Unit Tests** - Test individual functions and components
- **Integration Tests** - Test API endpoints and database interactions
- **End-to-End Tests** - Test complete user workflows

### Running Tests
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test path/to/test-file.test.ts
```

### Writing Tests
- Write tests for all new functionality
- Maintain at least 80% code coverage
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)

```typescript
// Example test
describe('TradingStrategy', () => {
  it('should generate buy signal when conditions are met', () => {
    // Arrange
    const strategy = new TradingStrategy();
    const marketData = createMockMarketData();
    
    // Act
    const signal = strategy.analyze(marketData);
    
    // Assert
    expect(signal.action).toBe('BUY');
    expect(signal.confidence).toBeGreaterThan(0.7);
  });
});
```

## 📚 Documentation

### Code Documentation
- Add JSDoc comments for public APIs
- Use clear variable and function names
- Include inline comments for complex logic

```typescript
/**
 * Calculates the optimal position size based on risk parameters
 * @param balance - Available trading balance
 * @param riskPercentage - Maximum risk percentage (0-1)
 * @param stopLoss - Stop loss price
 * @param entryPrice - Entry price
 * @returns Optimal position size
 */
function calculatePositionSize(
  balance: number,
  riskPercentage: number,
  stopLoss: number,
  entryPrice: number
): number {
  // Implementation
}
```

### README Updates
- Update README.md when adding new features
- Include examples and usage instructions
- Keep the documentation up to date

## 🎨 Code Style

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Use meaningful variable names
- Prefer `const` over `let`
- Use async/await over Promises

### React Components
- Use functional components with hooks
- Extract custom hooks for reusable logic
- Use TypeScript interfaces for props
- Keep components small and focused

```tsx
interface TradeButtonProps {
  action: 'BUY' | 'SELL';
  amount: number;
  onTrade: (action: string, amount: number) => void;
  disabled?: boolean;
}

export const TradeButton: React.FC<TradeButtonProps> = ({
  action,
  amount,
  onTrade,
  disabled = false
}) => {
  // Component implementation
};
```

## 🔐 Security Guidelines

### API Keys and Secrets
- Never commit API keys or secrets
- Use environment variables for sensitive data
- Validate all user inputs
- Implement proper error handling

### Trading Logic
- Always validate trading parameters
- Implement proper risk management
- Log all trading activities
- Use secure communication protocols

## 📊 Performance Guidelines

### Frontend
- Optimize bundle size
- Use React.memo for expensive components
- Implement proper loading states
- Minimize API calls

### Backend
- Use database indexing appropriately
- Implement caching for frequently accessed data
- Handle errors gracefully
- Monitor performance metrics

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Description** - Clear description of the issue
2. **Steps to Reproduce** - Detailed steps to reproduce the bug
3. **Expected Behavior** - What you expected to happen
4. **Actual Behavior** - What actually happened
5. **Environment** - OS, Node.js version, browser, etc.
6. **Screenshots** - If applicable

### Bug Report Template
```markdown
## Bug Description
Brief description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g. Windows 10]
- Node.js: [e.g. v20.0.0]
- Browser: [e.g. Chrome 91]

## Screenshots
If applicable, add screenshots
```

## 💡 Feature Requests

We welcome feature requests! Please:

1. Check existing issues first
2. Provide a clear use case
3. Explain the expected behavior
4. Consider the impact on existing users

### Feature Request Template
```markdown
## Feature Description
Brief description of the feature

## Use Case
Why is this feature needed?

## Proposed Solution
How should this feature work?

## Alternatives
Any alternative solutions considered?

## Additional Context
Any other context or screenshots
```

## 📞 Getting Help

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and discussions
- **Discord** - Real-time community chat
- **Email** - team@cryptopulse.com for security issues

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Hall of Fame page (coming soon)

## 📄 License

By contributing to CryptoPulse, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to CryptoPulse! 🚀
