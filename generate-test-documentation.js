#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Test Documentation Generator for Alkemio Test Suites
 * 
 * This script scans the repository for test files and generates a comprehensive
 * documentation listing all test suites and test cases.
 */

class TestDocumentationGenerator {
  constructor() {
    this.testSuites = {
      'server-api': [],
      'client-web': [],
      'testOld': []
    };
    this.totalTests = 0;
    this.totalDescribeBlocks = 0;
  }

  /**
   * Find all test files in a directory
   */
  findTestFiles(dir, category) {
    const testFilePatterns = ['.it-spec.ts', '.spec.ts', '.e2e-spec.ts'];
    const files = [];

    const scanDirectory = (currentDir) => {
      if (!fs.existsSync(currentDir)) return;

      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (testFilePatterns.some(pattern => item.endsWith(pattern))) {
          files.push({
            path: fullPath,
            relativePath: path.relative(process.cwd(), fullPath),
            name: item,
            category
          });
        }
      }
    };

    scanDirectory(dir);
    return files;
  }

  /**
   * Parse a test file to extract describe blocks and test cases
   */
  parseTestFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      const testSuite = {
        file: path.relative(process.cwd(), filePath),
        name: path.basename(filePath),
        describeBlocks: [],
        imports: this.extractImports(content)
      };

      let currentDescribe = null;
      let braceLevel = 0;
      let inDescribe = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Count braces to track nesting level
        braceLevel += (line.match(/{/g) || []).length;
        braceLevel -= (line.match(/}/g) || []).length;

        // Look for describe blocks
        const describeMatch = line.match(/describe\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (describeMatch) {
          if (currentDescribe && inDescribe) {
            testSuite.describeBlocks.push(currentDescribe);
          }
          
          currentDescribe = {
            name: describeMatch[1],
            line: i + 1,
            tests: [],
            nestedDescribes: []
          };
          inDescribe = true;
          this.totalDescribeBlocks++;
        }

        // Look for test/it blocks
        const testMatch = line.match(/(?:test|it)\s*\(\s*['"`]([^'"`]+)['"`]/) || 
                         line.match(/(?:test|it)\.(?:only|skip)\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (testMatch && currentDescribe) {
          currentDescribe.tests.push({
            name: testMatch[1],
            line: i + 1,
            type: line.includes('.only') ? 'only' : line.includes('.skip') ? 'skip' : 'normal'
          });
          this.totalTests++;
        }

        // If we exit the describe block
        if (inDescribe && braceLevel === 0 && line === '});') {
          if (currentDescribe) {
            testSuite.describeBlocks.push(currentDescribe);
            currentDescribe = null;
            inDescribe = false;
          }
        }
      }

      // Handle case where describe block doesn't end with closing brace on its own line
      if (currentDescribe && inDescribe) {
        testSuite.describeBlocks.push(currentDescribe);
      }

      return testSuite;
    } catch (error) {
      console.error(`Error parsing file ${filePath}:`, error.message);
      return {
        file: path.relative(process.cwd(), filePath),
        name: path.basename(filePath),
        describeBlocks: [],
        imports: [],
        error: error.message
      };
    }
  }

  /**
   * Extract import statements to understand dependencies
   */
  extractImports(content) {
    const importLines = content.split('\n')
      .filter(line => line.trim().startsWith('import'))
      .slice(0, 10) // Limit to first 10 imports to avoid clutter
      .map(line => line.trim());
    
    return importLines;
  }

  /**
   * Generate the documentation
   */
  async generateDocumentation() {
    console.log('🔍 Scanning for test files...');

    // Find all test files
    const serverApiFiles = this.findTestFiles('server-api', 'server-api');
    const clientWebFiles = this.findTestFiles('client-web', 'client-web');
    const testOldFiles = this.findTestFiles('testOld', 'testOld');

    console.log(`Found ${serverApiFiles.length} server-api test files`);
    console.log(`Found ${clientWebFiles.length} client-web test files`);
    console.log(`Found ${testOldFiles.length} legacy test files`);

    // Parse all test files
    console.log('📝 Parsing test files...');
    
    this.testSuites['server-api'] = serverApiFiles.map(file => this.parseTestFile(file.path));
    this.testSuites['client-web'] = clientWebFiles.map(file => this.parseTestFile(file.path));
    this.testSuites['testOld'] = testOldFiles.map(file => this.parseTestFile(file.path));

    // Generate markdown documentation
    const documentation = this.generateMarkdown();
    
    // Write to file
    const outputPath = 'TEST_DOCUMENTATION.md';
    fs.writeFileSync(outputPath, documentation);
    
    console.log(`📄 Documentation generated: ${outputPath}`);
    console.log(`📊 Total test suites: ${this.totalDescribeBlocks}`);
    console.log(`📊 Total test cases: ${this.totalTests}`);
    
    return outputPath;
  }

  /**
   * Generate markdown documentation
   */
  generateMarkdown() {
    const timestamp = new Date().toISOString().split('T')[0];
    
    let md = `# Alkemio Test Suites Documentation

> **Generated on**: ${timestamp}  
> **Repository**: [alkem-io/test-suites](https://github.com/alkem-io/test-suites)

This document provides a comprehensive overview of all test suites and test cases in the Alkemio test-suites repository, giving you complete visibility into what is being tested across the platform.

## 📊 Summary

- **Total Describe Blocks (Test Suites)**: ${this.totalDescribeBlocks}
- **Total Test Cases**: ${this.totalTests}
- **Server API Tests**: ${this.testSuites['server-api'].length} files
- **Client Web Tests**: ${this.testSuites['client-web'].length} files
- **Legacy Tests**: ${this.testSuites['testOld'].length} files

## 📁 Repository Structure

The test repository is organized into the following main categories:

### 1. Server API Tests (\`server-api/\`)
Integration and functional tests for the Alkemio GraphQL API server. These tests validate API endpoints, business logic, and data integrity.

**Test Categories:**
- **Account Management**: Transfer of innovation packs, account operations
- **Activity Logs**: Tracking user and system activities across spaces
- **Callouts**: Content publishing, post creation, callout management
- **Communications**: Community updates, forum discussions, notifications
- **Contributor Management**: User, organization, and virtual contributor management
- **Journey Management**: Spaces, subspaces, and platform navigation
- **Storage & Documents**: File uploads, document permissions, authorization
- **Templates**: Reusable content templates for spaces, posts, and whiteboards
- **Search & Pagination**: Search functionality and data pagination
- **Entitlements**: License and permission management

### 2. Client Web Tests (\`client-web/\`)
End-to-end tests for the Alkemio web client using Playwright. These tests validate user interactions and UI functionality.

**Test Categories:**
- **Authentication Flows**: Login, registration, verification processes
- **UI Navigation**: Tab navigation, user interface interactions

### 3. Shared Library (\`lib/\`)
Common utilities, helpers, and shared components used across test suites.

### 4. Legacy Tests (\`testOld/\`)
Older test implementations that are being phased out or migrated.

---

## 📋 Table of Contents

- [Server API Tests](#server-api-tests)
- [Client Web Tests](#client-web-tests)
- [Legacy Tests](#legacy-tests)

---

`;

    // Generate documentation for each category
    md += this.generateCategoryDocumentation('Server API Tests', this.testSuites['server-api']);
    md += this.generateCategoryDocumentation('Client Web Tests', this.testSuites['client-web']);
    md += this.generateCategoryDocumentation('Legacy Tests', this.testSuites['testOld']);

    // Add footer
    md += `\n---

## 🔄 Regenerating This Documentation

To regenerate this documentation with the latest test information:

\`\`\`bash
node generate-test-documentation.js
\`\`\`

This will scan all test files and create an updated version of this document.

---

*Documentation generated by the Alkemio Test Documentation Generator*
`;

    return md;
  }

  /**
   * Generate documentation for a specific category
   */
  generateCategoryDocumentation(categoryName, testFiles) {
    if (testFiles.length === 0) {
      return `## ${categoryName}\n\nNo test files found in this category.\n\n`;
    }

    let md = `## ${categoryName}\n\n`;
    
    // Group by directory for better organization
    const groupedFiles = this.groupFilesByDirectory(testFiles);
    
    for (const [directory, files] of Object.entries(groupedFiles)) {
      md += `### ${directory}\n\n`;
      
      for (const testFile of files) {
        md += this.generateFileDocumentation(testFile);
      }
    }
    
    return md;
  }

  /**
   * Group files by their directory structure
   */
  groupFilesByDirectory(testFiles) {
    const grouped = {};
    
    for (const file of testFiles) {
      const parts = file.file.split('/');
      const category = parts[0]; // server-api, client-web, etc.
      
      let dirPath = category;
      if (parts.length > 2) {
        // Group by the main functional area (e.g., functional-api, non-functional)
        dirPath = parts.slice(0, 3).join('/');
      }
      
      if (!grouped[dirPath]) {
        grouped[dirPath] = [];
      }
      grouped[dirPath].push(file);
    }
    
    return grouped;
  }

  /**
   * Generate documentation for a single test file
   */
  generateFileDocumentation(testFile) {
    let md = `#### ${testFile.name}\n\n`;
    md += `**File**: \`${testFile.file}\`\n\n`;
    
    if (testFile.error) {
      md += `⚠️ **Error parsing file**: ${testFile.error}\n\n`;
      return md;
    }

    if (testFile.describeBlocks.length === 0) {
      md += `*No test suites found in this file.*\n\n`;
      return md;
    }

    for (const describe of testFile.describeBlocks) {
      md += `**Test Suite**: ${describe.name}\n\n`;
      
      if (describe.tests.length > 0) {
        md += `Test Cases:\n`;
        for (const test of describe.tests) {
          const typeIndicator = test.type === 'only' ? ' 🎯' : test.type === 'skip' ? ' ⏭️' : '';
          md += `- ${test.name}${typeIndicator}\n`;
        }
        md += '\n';
      } else {
        md += `*No test cases found in this suite.*\n\n`;
      }
    }
    
    md += '---\n\n';
    return md;
  }
}

// Run the generator
if (require.main === module) {
  const generator = new TestDocumentationGenerator();
  generator.generateDocumentation()
    .then(outputPath => {
      console.log('\n✅ Test documentation generation completed successfully!');
      console.log(`📄 Output file: ${outputPath}`);
    })
    .catch(error => {
      console.error('❌ Error generating documentation:', error);
      process.exit(1);
    });
}

module.exports = TestDocumentationGenerator;