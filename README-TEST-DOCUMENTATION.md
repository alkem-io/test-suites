# Test Documentation Generator

This directory contains a Node.js script that automatically generates comprehensive documentation for all test suites and test cases in the Alkemio test-suites repository.

## 🎯 Purpose

The test documentation generator solves the problem of having poor visibility into what is being tested across the Alkemio platform. It provides:

- **Complete Test Coverage Overview**: Lists all test suites and individual test cases
- **Organized Structure**: Groups tests by functional areas and categories
- **Easy Navigation**: Clear hierarchy and table of contents
- **Up-to-date Information**: Can be regenerated anytime to reflect latest changes

## 📋 Generated Documentation

Running the generator creates `TEST_DOCUMENTATION.md` which includes:

- **Summary Statistics**: Total test suites, test cases, and files
- **Repository Structure**: Overview of different test categories
- **Detailed Test Listings**: Every test suite and test case with descriptions
- **File References**: Exact file paths for each test

### Coverage

The generator scans and documents:

- **Server API Tests** (92 files): Integration tests for GraphQL API
- **Client Web Tests** (4 files): End-to-end UI tests using Playwright  
- **Legacy Tests** (45 files): Older test implementations

## 🚀 Usage

### Prerequisites

- Node.js (the script uses built-in modules only)
- Access to the test-suites repository

### Running the Generator

```bash
# From the repository root
node generate-test-documentation.js
```

### Output

The script will:
1. Scan all test files (*.spec.ts, *.it-spec.ts, *.e2e-spec.ts)
2. Parse Jest/Playwright describe blocks and test cases
3. Generate `TEST_DOCUMENTATION.md` with comprehensive documentation

## 🔧 How It Works

The generator:

1. **File Discovery**: Recursively scans directories for test files
2. **Content Parsing**: Extracts `describe()` and `test()`/`it()` blocks using regex
3. **Structure Analysis**: Organizes tests by directory and functional area
4. **Documentation Generation**: Creates markdown with hierarchy and navigation

### Supported Test Patterns

- `*.it-spec.ts` - Integration tests  
- `*.spec.ts` - General test files
- `*.e2e-spec.ts` - End-to-end tests

### Supported Test Frameworks

- **Jest** (server-api tests)
- **Playwright** (client-web tests)

## 📊 Statistics

Last generation results:
- **457 Test Suites** (describe blocks)
- **727 Test Cases** (test/it blocks)  
- **141 Test Files** total

## 🔄 Keeping Documentation Updated

Run the generator after:
- Adding new test files
- Modifying existing test descriptions
- Restructuring test organization
- Major releases or milestones

## 🛠️ Troubleshooting

### Common Issues

**"No test files found"**
- Ensure you're running from the repository root
- Check that test files follow naming conventions

**"Error parsing file"**  
- Some files may have complex syntax that the regex parser can't handle
- These files will be marked with error messages in the output

### Script Limitations

- Uses regex parsing (not AST), so complex nested structures may not parse perfectly
- Focuses on `describe()` and `test()`/`it()` blocks only
- Does not analyze test implementation details

## 📝 Example Output Structure

```
# Alkemio Test Suites Documentation

## Summary
- Total Test Suites: 457
- Total Test Cases: 722

## Server API Tests
### server-api/src/functional-api
#### space.it-spec.ts
**Test Suite**: Space entity
Test Cases:
- should create space
- should update space nameId
- should remove space
```

---

*This generator helps maintain visibility into the comprehensive test coverage of the Alkemio platform.*