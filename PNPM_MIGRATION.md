# NPM to PNPM Migration Summary

This document summarizes the migration from npm to pnpm completed for the test-suites repository.

## Key Changes Made

### 1. Workspace Configuration
- Added `pnpm-workspace.yaml` to define the 3 workspace packages:
  - `lib` - Shared test library
  - `server-api` - Server API test suite  
  - `client-web` - Client web test suite

### 2. Package.json Updates
- Changed `engines.npm` to `engines.pnpm` with version `>=8`
- Added missing dependencies:
  - `rimraf` to lib and client-web packages
  - `@jest/globals` to server-api
  - Fixed `@types/graphql-upload` version to 8.0.12 for compatibility

### 3. Lock File Migration
- Removed all `package-lock.json` files
- Generated `pnpm-lock.yaml` at workspace root
- Added `.npmrc` with pnpm configuration

### 4. CI/CD Updates
- Updated `.travis.yml` to use pnpm commands and workspace filtering
- Changed cache directories to use pnpm store
- Updated install and build commands to use pnpm workspace commands

### 5. Script Updates
- Updated all shell scripts in `.scripts/` directory:
  - `npm run` → `pnpm`
  - `npm run-script` → `pnpm`
- Updated documentation in README files

## PNPM Configuration

The `.npmrc` file includes:
```
engine-strict=true
auto-install-peers=true
shamefully-hoist=true
```

The `shamefully-hoist=true` setting was necessary to resolve TypeScript type inference issues with pnpm's strict dependency isolation.

## Workspace Commands

Common commands after migration:

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm -r build

# Build specific package
pnpm --filter @alkemio/tests-lib build
pnpm --filter @alkemio/test-suite-server-api build
pnpm --filter @alkemio/test-suite-client-web build

# Run tests in server-api
pnpm --filter @alkemio/test-suite-server-api test:nightly

# Lint server-api
pnpm --filter @alkemio/test-suite-server-api lint
```

## Benefits of Migration

1. **Better Dependency Management**: pnpm's strict dependency resolution prevents phantom dependencies
2. **Disk Space Efficiency**: pnpm uses hard links to save disk space
3. **Faster Installations**: Content-addressable storage and better caching
4. **Workspace Support**: Native monorepo support with filtering
5. **Better Security**: Stricter dependency isolation

## Verification

All packages build successfully:
- ✅ lib package builds despite initial type issues (resolved with shamefully-hoist)
- ✅ server-api package builds and lints successfully  
- ✅ client-web package builds successfully
- ✅ Workspace commands work correctly
- ✅ CI/CD configuration updated and ready

The migration is complete and the repository is ready for development with pnpm.