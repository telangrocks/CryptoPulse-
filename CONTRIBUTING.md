# Contributing to CryptoPulse

Thank you for your interest in contributing to CryptoPulse! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Documentation](#documentation)
- [Release Process](#release-process)

## 🤝 Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10.18.0+
- Git
- Docker (optional, for containerized development)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/Cryptopulse-.git
   cd Cryptopulse-
   ```

3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/telangrocks/Cryptopulse-.git
   ```

## 🛠️ Development Setup

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp env-templates/backend.env.production backend/.env
cp env-templates/frontend.env.production frontend/.env

# Start development servers
pnpm dev:all
```

### Environment Configuration

1. **Backend Environment** (`backend/.env`):
   - Copy from `env-templates/backend.env.production`
   - Configure database connections
   - Set up API keys for exchanges
   - Configure security settings

2. **Frontend Environment** (`frontend/.env`):
   - Copy from `env-templates/frontend.env.production`
   - Set API base URL
   - Configure encryption keys

## 📝 Contributing Guidelines

### Types of Contributions

- **Bug Fixes**: Fix existing issues
- **Features**: Add new functionality
- **Documentation**: Improve or add documentation
- **Tests**: Add or improve test coverage
- **Performance**: Optimize existing code
- **Security**: Enhance security measures

### Workflow

1. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**:
   - Follow coding standards
   - Write tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**:
   ```bash
   # Run all tests
   pnpm test:all
   
   # Run linting
   pnpm lint:all
   
   # Run type checking
   pnpm typecheck:all
   
   # Run security audit
   pnpm audit:full
   ```

4. **Commit Your Changes**:
   ```bash
   git add .
   git commit -m "feat: add new trading feature"
   ```

5. **Push and Create Pull Request**:
   ```bash
   git push origin feature/your-feature-name
   ```

## 🎯 Code Standards

### General Guidelines

- **Clean Code**: Write readable, maintainable code
- **DRY Principle**: Don't repeat yourself
- **SOLID Principles**: Follow object-oriented design principles
- **Consistent Naming**: Use descriptive, consistent names
- **Comments**: Document complex logic and business rules

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Prefer `const` over `let`, avoid `var`
- Use arrow functions for callbacks
- Use async/await over Promises

### React Components

- Use functional components with hooks
- Use TypeScript interfaces for props
- Implement proper error boundaries
- Use React.memo for performance optimization
- Follow accessibility guidelines

### Backend Code

- Use async/await for asynchronous operations
- Implement proper error handling
- Use middleware for cross-cutting concerns
- Follow RESTful API design
- Implement proper logging

## 🧪 Testing

### Test Types

1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test API endpoints and database operations
3. **E2E Tests**: Test complete user workflows
4. **Performance Tests**: Test system performance under load

### Running Tests

```bash
# Run all tests
pnpm test:all

# Run backend tests
pnpm test:backend

# Run frontend tests
pnpm test:frontend

# Run E2E tests
pnpm test:e2e

# Run tests with coverage
pnpm test:coverage
```

### Writing Tests

- Write tests for all new functionality
- Aim for 80%+ code coverage
- Use descriptive test names
- Test edge cases and error conditions
- Mock external dependencies

### Test Structure

```typescript
describe('Component Name', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something specific', () => {
    // Test implementation
  });

  it('should handle error cases', () => {
    // Error handling test
  });
});
```

## 🔄 Pull Request Process

### Before Submitting

- [ ] Code follows project standards
- [ ] All tests pass
- [ ] No linting errors
- [ ] TypeScript compilation successful
- [ ] Security audit passes
- [ ] Documentation updated
- [ ] Commit messages follow conventional format

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs automatically
2. **Code Review**: At least one maintainer reviews
3. **Testing**: All tests must pass
4. **Approval**: Maintainer approves the PR
5. **Merge**: PR is merged to main branch

## 🐛 Issue Reporting

### Bug Reports

When reporting bugs, include:

- **Description**: Clear description of the issue
- **Steps to Reproduce**: Detailed steps to reproduce
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: OS, browser, Node.js version
- **Screenshots**: If applicable
- **Logs**: Relevant error logs

### Feature Requests

When requesting features, include:

- **Description**: Clear description of the feature
- **Use Case**: Why this feature is needed
- **Proposed Solution**: How you think it should work
- **Alternatives**: Other solutions considered
- **Additional Context**: Any other relevant information

## 📚 Documentation

### Code Documentation

- Use JSDoc for functions and classes
- Document complex algorithms
- Include examples for public APIs
- Keep README files updated

### API Documentation

- Document all API endpoints
- Include request/response examples
- Document error codes and messages
- Keep OpenAPI/Swagger specs updated

### User Documentation

- Update user guides for new features
- Include screenshots and examples
- Keep installation instructions current
- Document configuration options

## 🚀 Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. **Update Version**: Update version in package.json files
2. **Update Changelog**: Add changes to CHANGELOG.md
3. **Create Release**: Create GitHub release
4. **Deploy**: Deploy to production
5. **Announce**: Announce release to community

## 🏗️ Project Structure

```
CryptoPulse/
├── .github/workflows/     # CI/CD pipelines
├── backend/               # Backend API
│   ├── lib/              # Core libraries
│   ├── tests/            # Backend tests
│   └── package.json
├── frontend/              # React frontend
│   ├── src/              # Source code
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities
│   │   └── tests/        # Frontend tests
│   └── package.json
├── e2e/                   # E2E tests
├── docs/                  # Documentation
├── scripts/               # Utility scripts
└── README.md
```

## 🤔 Getting Help

- **Documentation**: Check the docs folder
- **Issues**: Search existing issues
- **Discussions**: Use GitHub Discussions
- **Discord**: Join our Discord server
- **Email**: Contact maintainers

## 📄 License

By contributing to CryptoPulse, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation
- Community acknowledgments

Thank you for contributing to CryptoPulse! 🚀