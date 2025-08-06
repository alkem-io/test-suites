# Test Repository Optimization Plan

## Current Issues Identified

### 1. Code Duplication
- GraphQL files duplicated in `client-web/src/duplicate/`
- Similar test utilities across `client-web` and `server-api`
- Jest configuration patterns repeated across projects
- Common helper functions not centralized in `lib`

### 2. Outdated Dependencies
- Multiple deprecated packages in `package-lock.json`
- Inconsistent dependency versions across sub-projects
- Missing workspace-level dependency management

### 3. Legacy Code
- `testOld/` directory contains outdated test scripts
- TODO comments indicating incomplete refactoring
- Unused or deprecated test files

### 4. Configuration Inconsistencies
- Different Jest configurations across projects
- Inconsistent TypeScript configurations
- Repeated ESLint rules and Prettier settings

## Optimization Actions

### Phase 1: Repository Structure Cleanup

1. **Remove Legacy Code**
   - Clean up `testOld/` directory
   - Archive or remove deprecated test files
   - Remove unused dependencies

2. **Create Monorepo Workspace**
   - Add root `package.json` with workspaces
   - Centralize common dependencies
   - Standardize scripts across projects

3. **Move Duplicated Code to Library**
   - Migrate shared utilities to `lib/`
   - Consolidate GraphQL operations
   - Create shared test helpers

### Phase 2: Configuration Standardization

1. **Unified Build System**
   - Standardize TypeScript configurations
   - Centralize Jest configurations
   - Unify linting and formatting rules

2. **Environment Management**
   - Standardize environment variable handling
   - Create shared configuration management
   - Improve secret management

### Phase 3: Test Infrastructure Improvements

1. **Test Optimization**
   - Implement test parallelization
   - Add test caching
   - Improve test reporting

2. **CI/CD Enhancements**
   - Add proper test splitting
   - Implement incremental testing
   - Add performance monitoring

## Expected Benefits

- **Reduced Maintenance**: Centralized code reduces duplication
- **Improved Performance**: Better caching and parallelization
- **Easier Onboarding**: Consistent structure and documentation
- **Better Reliability**: Standardized configurations reduce errors

## Implementation Status

### ✅ Completed
1. **Repository Structure**
   - Created root `package.json` with workspace configuration
   - Added shared TypeScript configuration (`tsconfig.base.json`)
   - Created shared Jest configuration template
   - Added shared ESLint and Prettier configurations

2. **Code Consolidation**
   - Moved duplicate GraphQL operations to `lib/src/graphql/`
   - Created shared test utilities in `lib/src/utils/test-helpers.ts`
   - Updated lib exports to include new utilities

3. **Automation Scripts**
   - Created cleanup script (`scripts/cleanup-legacy.sh`)
   - Created dependency update script (`scripts/update-dependencies.sh`)

### 🔄 In Progress
1. **Configuration Migration**
   - Server-API TypeScript config updated to extend base
   - Need to update Client-Web configurations
   - Jest configurations need to be updated to use shared base

### 📋 Next Steps
1. Run cleanup script to remove legacy code
2. Update all workspace Jest configs to extend base configuration  
3. Update Client-Web TypeScript configuration
4. Run dependency updates and security audit
5. Test all workspaces after changes
6. Add pre-commit hooks (Husky) for code quality
