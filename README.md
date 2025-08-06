<p align="center">
  <a href="https://alkemio.org/" target="blank"><img src="https://alkemio.org/uploads/logos/alkemio-logo.svg" width="400" alt="Alkemio Logo" /></a>
</p>
<p align="center"><i>Smart safe spaces for collective action. On a platform designed to benefit society.</i></p>

# Alkemio Test Suites
Alkemio quallity assurance packages.

##
This repository contains three core elements:
* Tests Library: for shared components that can be re-used across test suites
* Test Suite **Server-API**: used to validate the Alkemio server api.
* Test Suite **Client-web**: used to validate the Alkemio client web interaction.

The above are the maintained test suite related packages.

To do:
* There is a testOld directory that contains scripts / other work that has been carried out over the years and that will need to be cleaned up
* Bring back in the use of Husky
* Migrated code that is duplicated between client-web + server-api to be in the tests-lib package

## 🚀 Recent Optimizations (2025)

This repository has been recently optimized for better maintainability and performance:

- **✅ Workspace Structure**: Implemented monorepo with shared configurations
- **✅ Code Deduplication**: Moved shared utilities to central library  
- **✅ Standardized Configs**: Unified TypeScript, Jest, ESLint, and Prettier settings
- **✅ Legacy Cleanup**: Automated removal of outdated test files and configurations

### Quick Start

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Run all tests
npm run test

# Apply optimizations (if not done yet)
./scripts/optimize-repository.sh
```

For detailed information, see [OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md)

## 📁 Repository Structure

```
test-suites/
├── lib/                    # 📚 Shared utilities and types
├── client-web/            # 🌐 Web client testing suite  
├── server-api/            # 🔧 API testing suite
└── scripts/               # 🛠️ Automation and maintenance scripts
```

