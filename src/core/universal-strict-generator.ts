/**
 * UNIVERSAL STRICT MODE GENERATOR
 * Takes plain English and generates exact Playwright code with zero tolerance for deviations
 */

import { generateTestCase, TestCase, TestStep } from './dsl-generator';
import { generateCode } from './code-generator';

export interface PlainEnglishTestRequest {
  description: string;
  baseUrl?: string;
}

export interface UniversalStrictResult {
  resolvedSteps: string[];
  playwrightCode: string;
  extractedValues: Record<string, string>;
  errors: string[];
}

/**
 * MAIN ENTRY POINT: Takes plain English and returns exact Playwright code
 * Example: "try to login with username Sam and password sammy"
 */
export function generateFromPlainEnglish(
  plainEnglish: string,
  baseUrl: string = '// TODO: URL'
): UniversalStrictResult {
  
  // Step 1: Extract all values from plain English
  const extractedValues = extractAllValues(plainEnglish);
  
  // Step 2: Parse into resolved steps
  const resolvedSteps = parseToResolvedSteps(plainEnglish, extractedValues);
  
  // Step 3: Generate TestCase
  const testCase = generateTestCase(plainEnglish, baseUrl);
  
  // Step 4: Apply STRICT MODE enhancements
  const strictTestCase = enhanceWithStrictMode(testCase, extractedValues, plainEnglish);
  
  // Step 5: Generate Playwright code
  try {
    const result = generateCode(strictTestCase, {
      framework: 'playwright',
      language: 'typescript'
    });

    // Step 6: Self-validation
    const validationErrors = performSelfValidation(plainEnglish, result.code, extractedValues);
    
    if (validationErrors.length > 0) {
      return {
        resolvedSteps,
        playwrightCode: `ERROR: DEVIATION DETECTED\n${validationErrors.join('\n')}`,
        extractedValues,
        errors: validationErrors
      };
    }
    
    return {
      resolvedSteps,
      playwrightCode: result.code,
      extractedValues,
      errors: []
    };
    
  } catch (error) {
    return {
      resolvedSteps,
      playwrightCode: `ERROR: ${error instanceof Error ? error.message : 'Generation failed'}`,
      extractedValues,
      errors: [error instanceof Error ? error.message : 'Generation failed']
    };
  }
}

/**
 * Extract ALL values from plain English with aggressive pattern matching
 */
function extractAllValues(description: string): Record<string, string> {
  const values: Record<string, string> = {};
  
  // Username extraction (multiple patterns)
  const usernamePatterns = [
    /(?:try\s+to\s+)?(?:login|signin|log\s+in)\s+with\s+username\s+([A-Za-z0-9_\.@-]+)/i,
    /(?:try\s+to\s+)?(?:login|signin|log\s+in)\s+with\s+user\s+([A-Za-z0-9_\.@-]+)/i,
    /(?:try\s+to\s+)?(?:login|signin|log\s+in)\s+using\s+([A-Za-z0-9_\.@-]+)/i,
    /username\s+([A-Za-z0-9_\.@-]+)(?:\s+and|\s*$)/i,
    /user\s+([A-Za-z0-9_\.@-]+)(?:\s+and|\s*$)/i,
    /with\s+([A-Za-z0-9_\.@-]+)\s+and\s+password/i
  ];
  
  for (const pattern of usernamePatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      values.username = match[1].trim();
      break;
    }
  }
  
  // Password extraction (multiple patterns)
  const passwordPatterns = [
    /(?:and\s+)?password\s+([A-Za-z0-9_\.@!-]+)/i,
    /(?:and\s+)?pass\s+([A-Za-z0-9_\.@!-]+)/i,
    /and\s+([A-Za-z0-9_\.@!-]+)(?:\s*$|\s*[,.])/i // Captures second value after "and"
  ];
  
  for (const pattern of passwordPatterns) {
    const match = description.match(pattern);
    if (match && match[1] && !values.username?.includes(match[1])) {
      values.password = match[1].trim();
      break;
    }
  }
  
  // URL extraction
  const urlMatch = description.match(/(?:go\s+to|visit|navigate\s+to|login\s+to)\s+(https?:\/\/[^\s]+)/i);
  if (urlMatch) {
    values.url = urlMatch[1];
  }
  
  // Button/Action extraction
  const buttonMatch = description.match(/(?:click|press|tap)\s+(?:the\s+)?(?:login|signin|submit|register)/i);
  if (buttonMatch) {
    values.button = buttonMatch[0].replace(/(?:click|press|tap)\s+(?:the\s+)?/i, '');
  }
  
  // Expected result extraction
  const expectMatch = description.match(/expect\s+([^,.\n]+)/i);
  if (expectMatch) {
    values.expected = expectMatch[1].trim();
  }
  
  return values;
}

/**
 * Parse plain English into resolved steps checklist
 */
function parseToResolvedSteps(description: string, values: Record<string, string>): string[] {
  const steps: string[] = [];
  const lowerDesc = description.toLowerCase();
  
  // Navigation step
  if (values.url) {
    steps.push(`Navigate to ${values.url}`);
  } else if (lowerDesc.includes('login') || lowerDesc.includes('signin')) {
    steps.push(`Navigate to login page (URL: ${values.url || '// TODO: URL not specified'})`);
  }
  
  // Form filling steps
  if (values.username) {
    steps.push(`Fill username field with "${values.username}"`);
  }
  
  if (values.password) {
    steps.push(`Fill password field with "${values.password}"`);
  }
  
  // Click action
  if (lowerDesc.includes('login') || lowerDesc.includes('signin')) {
    steps.push(`Click login button`);
  } else if (lowerDesc.includes('submit')) {
    steps.push(`Click submit button`);
  }
  
  // Assertion step
  if (values.expected) {
    steps.push(`Assert: ${values.expected}`);
  } else if (lowerDesc.includes('login') && !lowerDesc.includes('wrong') && !lowerDesc.includes('invalid')) {
    steps.push(`Assert: URL contains '/dashboard' OR login success indicator appears`);
  } else if (lowerDesc.includes('error') || lowerDesc.includes('wrong') || lowerDesc.includes('invalid')) {
    steps.push(`Assert: Error message appears (exact text: // TODO: Specify error message)`);
  }
  
  return steps;
}

/**
 * Enhance TestCase with STRICT MODE rules
 */
function enhanceWithStrictMode(
  testCase: TestCase, 
  extractedValues: Record<string, string>,
  originalDescription: string
): TestCase {
  const enhancedSteps: TestStep[] = [];
  
  for (const step of testCase.steps) {
    switch (step.action) {
      case 'goto':
        enhancedSteps.push({
          action: 'goto',
          path: extractedValues.url || step.path || '// TODO: URL not specified'
        });
        break;
        
      case 'fill':
        if (step.locator?.value?.toLowerCase().includes('username')) {
          enhancedSteps.push({
            action: 'fill',
            locator: step.locator,
            text: extractedValues.username || '// TODO: Username not specified'
          });
        } else if (step.locator?.value?.toLowerCase().includes('password')) {
          enhancedSteps.push({
            action: 'fill',
            locator: step.locator,
            text: extractedValues.password || '// TODO: Password not specified'
          });
        } else {
          enhancedSteps.push(step);
        }
        break;
        
      case 'click':
        enhancedSteps.push(step);
        break;
        
      case 'assert':
        // Enhance assertions based on description
        if (originalDescription.toLowerCase().includes('dashboard')) {
          enhancedSteps.push({
            action: 'assert',
            assertion: {
              type: 'urlContains',
              value: '/dashboard'
            }
          });
        } else if (extractedValues.expected) {
          enhancedSteps.push({
            action: 'assert',
            assertion: {
              type: 'containsText',
              locator: { type: 'css', value: 'body' },
              value: extractedValues.expected
            }
          });
        } else {
          enhancedSteps.push({
            action: 'assert',
            assertion: {
              type: 'containsText',
              locator: { type: 'css', value: '// TODO: Specify selector' },
              value: '// TODO: Specify expected text'
            }
          });
        }
        break;
        
      default:
        enhancedSteps.push(step);
    }
  }
  
  return {
    ...testCase,
    steps: enhancedSteps
  };
}

/**
 * Self-validation to ensure no deviations from original request
 */
function performSelfValidation(
  originalDescription: string,
  generatedCode: string,
  extractedValues: Record<string, string>
): string[] {
  const errors: string[] = [];
  
  // Check that all extracted values appear in generated code
  Object.entries(extractedValues).forEach(([key, value]) => {
    if (value && !value.startsWith('//') && !generatedCode.includes(value)) {
      errors.push(`DEVIATION: Extracted ${key} value "${value}" not found in generated code`);
    }
  });
  
  // Check for forbidden substitutions
  if (extractedValues.username && generatedCode.includes('testuser') && extractedValues.username !== 'testuser') {
    errors.push(`DEVIATION: Username "${extractedValues.username}" replaced with placeholder "testuser"`);
  }
  
  if (extractedValues.password && generatedCode.includes('password123') && extractedValues.password !== 'password123') {
    errors.push(`DEVIATION: Password "${extractedValues.password}" replaced with placeholder "password123"`);
  }
  
  // Check for forbidden additions
  const forbiddenAdditions = ['waitForTimeout', 'waitForSelector', 'retry', 'catch'];
  forbiddenAdditions.forEach(forbidden => {
    if (generatedCode.includes(forbidden)) {
      errors.push(`DEVIATION: Unauthorized addition "${forbidden}" found in code`);
    }
  });
  
  return errors;
}