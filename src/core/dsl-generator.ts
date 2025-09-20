export interface TestStep {
  action: "goto" | "fill" | "click" | "assert";
  path?: string;
  locator?: {
    type?: "label" | "id" | "role" | "text" | "css" | "xpath";
    value?: string;
    role?: string;
    name?: string;
  };
  text?: string;
  assertion?: {
    type: "containsText" | "exactText" | "toHaveText" | "visible" | "urlContains" | "hasValue" | "isEnabled" | "isDisabled";
    locator?: {
      type?: string;
      css?: string;
      value?: string;
      xpath?: string;
    };
    value?: string;
  };
}

export interface TestCase {
  meta: {
    name: string;
    baseUrl: string;
    description?: string;
    tags?: string[];
  };
  steps: TestStep[];
}

export interface GenerationOptions {
  includeNavigation?: boolean;
  defaultTimeout?: number;
  includeScreenshots?: boolean;
  generateAssertions?: boolean;
  testData?: Record<string, string>; // User-provided test data
  baseUrl?: string; // Allow custom base URLs
}

/**
 * Enhanced test case generator with improved NLP parsing
 */
export function generateTestCase(
  description: string, 
  baseUrl: string, 
  options: GenerationOptions = {}
): TestCase {
  const {
    includeNavigation = true,
    generateAssertions = true
  } = options;

  // Convert description to snake_case for name
  const name = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');

  const steps: TestStep[] = [];
  const lowerDesc = description.toLowerCase();

  // Navigation step
  if (includeNavigation) {
    const path = extractPath(lowerDesc) || "/";
    steps.push({ action: "goto", path });
  }

  // Parse form interactions
  parseFormInteractions(lowerDesc, steps, options.testData);
  
  // Parse click actions
  parseClickActions(lowerDesc, steps);
  
  // Parse assertions
  if (generateAssertions) {
    parseAssertions(lowerDesc, steps);
  }

  return {
    meta: {
      name,
      baseUrl,
      description,
      tags: extractTags(lowerDesc)
    },
    steps
  };
}

function extractPath(description: string): string | null {
  const pathPatterns = [
    // Explicit URL patterns
    /(?:go to|navigate to|visit|open)\s+['"](https?:\/\/[^'"]+)['"]/i,
    /(?:go to|navigate to|visit|open)\s+(https?:\/\/[^\s]+)/i,
    /(?:go to|navigate to|visit|open)\s+['"\/]([^'"]+)['"\/]/i,
    
    // Page-specific patterns
    /(?:login|signin)\s+page/i,
    /(?:register|signup)\s+page/i,
    /(?:dashboard|profile|settings)\s+page/i,
    
    // Generic page patterns
    /(?:go to|navigate to|visit|open)\s+(?:the\s+)?(\w+)\s+page/i
  ];

  for (const pattern of pathPatterns) {
    const match = description.match(pattern);
    if (match) {
      // Handle full URLs
      if (match[1] && (match[1].startsWith('http://') || match[1].startsWith('https://'))) {
        return match[1];
      }
      
      // Handle specific page types
      if (pattern.source.includes('login|signin')) return '/login';
      if (pattern.source.includes('register|signup')) return '/register';
      if (pattern.source.includes('dashboard')) return '/dashboard';
      if (pattern.source.includes('profile')) return '/profile';
      if (pattern.source.includes('settings')) return '/settings';
      
      // Handle custom paths
      if (match[1]) {
        return match[1].startsWith('/') ? match[1] : `/${match[1]}`;
      }
      
      return '/';
    }
  }

  return null;
}

function parseFormInteractions(description: string, steps: TestStep[], testData?: Record<string, string>): void {
  // UNIVERSAL STRICT MODE: Extract exact values with aggressive pattern matching
  const exactValues = extractExactValues(description);
  
  const formPatterns = [
    // Primary patterns for login with multiple variations
    { pattern: /(?:try\s+to\s+)?(?:login|signin|log\s+in)\s+with\s+username\s+([A-Za-z0-9_@.-]+)(?:\s+and\s+password\s+([A-Za-z0-9_@.-]+))?/i, fields: ['username', 'password'] },
    { pattern: /(?:try\s+to\s+)?(?:login|signin|log\s+in)\s+with\s+user\s+([A-Za-z0-9_@.-]+)(?:\s+and\s+password\s+([A-Za-z0-9_@.-]+))?/i, fields: ['username', 'password'] },
    { pattern: /(?:try\s+to\s+)?(?:login|signin|log\s+in)\s+using\s+([A-Za-z0-9_@.-]+)(?:\s+and\s+([A-Za-z0-9_@.-]+))?/i, fields: ['username', 'password'] },
    { pattern: /(?:try\s+to\s+)?(?:login|signin|log\s+in)\s+as\s+([A-Za-z0-9_@.-]+)(?:\s+with\s+password\s+([A-Za-z0-9_@.-]+))?/i, fields: ['username', 'password'] },
    
    // Quoted value patterns with aggressive matching
    { pattern: /username\s+['"']([^'"]+)['"'](?:\s+and\s+password\s+['"']([^'"]+)['"'])?/i, fields: ['username', 'password'] },
    { pattern: /user\s+['"']([^'"]+)['"'](?:\s+and\s+password\s+['"']([^'"]+)['"'])?/i, fields: ['username', 'password'] },
    { pattern: /login\s+with\s+['"']([^'"]+)['"'](?:\s+and\s+['"']([^'"]+)['"'])?/i, fields: ['username', 'password'] },
    
    // Generic form field patterns
    { pattern: /(?:enter|fill|type|input)\s+(?:username|user\s*name)\s*(?:with\s*|as\s*)?['"']?([^'"]*)['"']?/i, fields: ['username'] },
    { pattern: /(?:enter|fill|type|input)\s+(?:password|pass)\s*(?:with\s*|as\s*)?['"']?([^'"]*)['"']?/i, fields: ['password'] },
    { pattern: /(?:enter|fill|type|input)\s+(?:email|e-mail)\s*(?:with\s*|as\s*)?['"']?([^'"]*)['"']?/i, fields: ['email'] },
    { pattern: /(?:enter|fill|type|input)\s+(?:name|full\s*name)\s*(?:with\s*|as\s*)?['"']?([^'"]*)['"']?/i, fields: ['name'] },
    { pattern: /(?:enter|fill|type|input)\s+(?:phone|telephone)\s*(?:with\s*|as\s*)?['"']?([^'"]*)['"']?/i, fields: ['phone'] },
    
    // Direct value assignment patterns
    { pattern: /set\s+username\s+to\s+([A-Za-z0-9_@.-]+)/i, fields: ['username'] },
    { pattern: /set\s+password\s+to\s+([A-Za-z0-9_@.-]+)/i, fields: ['password'] },
    { pattern: /use\s+username\s+([A-Za-z0-9_@.-]+)/i, fields: ['username'] },
    { pattern: /use\s+password\s+([A-Za-z0-9_@.-]+)/i, fields: ['password'] }
  ];

  for (const { pattern, fields } of formPatterns) {
    const match = description.match(pattern);
    if (match) {
      fields.forEach((fieldName, index) => {
        const value = match[index + 1]?.trim();
        if (value && fieldName) {
          // STRICT MODE: Use exact value provided by user
          steps.push({
            action: "fill",
            locator: { 
              type: "label" as const, 
              value: capitalizeFirst(fieldName) 
            },
            text: value // Use exact value, no substitution
          });
        } else if (fieldName) {
          // Use exact values from extraction if available
          const exactValue = exactValues[fieldName];
          if (exactValue) {
            steps.push({
              action: "fill",
              locator: { 
                type: "label" as const, 
                value: capitalizeFirst(fieldName) 
              },
              text: exactValue
            });
          } else {
            // STRICT MODE: TODO instead of placeholder
            steps.push({
              action: "fill",
              locator: { 
                type: "label" as const, 
                value: capitalizeFirst(fieldName) 
              },
              text: `// TODO: Specify ${fieldName} value`
            });
          }
        }
      });
      break; // Only process first matching pattern
    }
  }
}

/**
 * UNIVERSAL STRICT MODE: Aggressive value extraction from plain English
 * Extracts EXACT values with zero tolerance for substitution
 */
function extractExactValues(description: string): Record<string, string> {
  const values: Record<string, string> = {};
  
  // Ultra-aggressive username extraction patterns
  const usernamePatterns = [
    // Direct patterns with 'with', 'using', 'as'
    /(?:login|signin|log\s+in)\s+with\s+username\s+([A-Za-z0-9_@.-]+)/i,
    /(?:login|signin|log\s+in)\s+with\s+user\s+([A-Za-z0-9_@.-]+)/i,
    /(?:login|signin|log\s+in)\s+using\s+([A-Za-z0-9_@.-]+)/i,
    /(?:login|signin|log\s+in)\s+as\s+([A-Za-z0-9_@.-]+)/i,
    
    // Generic username patterns
    /username\s+([A-Za-z0-9_@.-]+)(?!\s*['"'])/i,
    /user\s+([A-Za-z0-9_@.-]+)(?!\s*['"'])/i,
    /username\s+['"']([^'"]+)['"']/i,
    /user\s+['"']([^'"]+)['"']/i,
    
    // Alternative patterns
    /set\s+username\s+to\s+([A-Za-z0-9_@.-]+)/i,
    /use\s+username\s+([A-Za-z0-9_@.-]+)/i,
    /enter\s+username\s+([A-Za-z0-9_@.-]+)/i
  ];
  
  for (const pattern of usernamePatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      values['username'] = match[1].trim();
      break;
    }
  }
  
  // Ultra-aggressive password extraction patterns
  const passwordPatterns = [
    // Direct patterns with 'and password'
    /and\s+password\s+([A-Za-z0-9_@.-]+)(?!\s*['"'])/i,
    /with\s+password\s+([A-Za-z0-9_@.-]+)(?!\s*['"'])/i,
    
    // Generic password patterns
    /password\s+([A-Za-z0-9_@.-]+)(?!\s*['"'])/i,
    /pass\s+([A-Za-z0-9_@.-]+)(?!\s*['"'])/i,
    /password\s+['"']([^'"]+)['"']/i,
    /pass\s+['"']([^'"]+)['"']/i,
    
    // Alternative patterns
    /set\s+password\s+to\s+([A-Za-z0-9_@.-]+)/i,
    /use\s+password\s+([A-Za-z0-9_@.-]+)/i,
    /enter\s+password\s+([A-Za-z0-9_@.-]+)/i
  ];
  
  for (const pattern of passwordPatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      values['password'] = match[1].trim();
      break;
    }
  }
  
  // Enhanced email extraction
  const emailPatterns = [
    /email\s+['"']?([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})['"']?/i,
    /with\s+email\s+([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i,
    /using\s+email\s+([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i
  ];
  
  for (const pattern of emailPatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      values['email'] = match[1].trim();
      break;
    }
  }
  
  return values;
}

function parseClickActions(description: string, steps: TestStep[]): void {
  const clickPatterns = [
    // Login button patterns with variations
    { pattern: /(?:click|press|tap|hit)\s+(?:on\s+)?(?:the\s+)?(?:login|signin|log\s*in)\s*(?:button)?/i, element: 'Login' },
    { pattern: /(?:submit|send)\s+(?:the\s+)?(?:login|signin)\s*(?:form)?/i, element: 'Login' },
    
    // Other common buttons
    { pattern: /(?:click|press|tap|hit)\s+(?:on\s+)?(?:the\s+)?(?:register|signup|sign\s*up)\s*(?:button)?/i, element: 'Register' },
    { pattern: /(?:click|press|tap|hit)\s+(?:on\s+)?(?:the\s+)?(?:submit|send)\s*(?:button)?/i, element: 'Submit' },
    { pattern: /(?:click|press|tap|hit)\s+(?:on\s+)?(?:the\s+)?(?:save|update)\s*(?:button)?/i, element: 'Save' },
    { pattern: /(?:click|press|tap|hit)\s+(?:on\s+)?(?:the\s+)?(?:cancel|close)\s*(?:button)?/i, element: 'Cancel' },
    
    // Custom button text with quotes
    { pattern: /(?:click|press|tap|hit)\s+(?:on\s+)?(?:the\s+)?['"']([^'"]+)['"']/i, element: null },
    
    // Button patterns without quotes
    { pattern: /(?:click|press|tap|hit)\s+(?:on\s+)?(?:the\s+)?(\w+)\s*(?:button)?/i, element: null }
  ];

  for (const { pattern, element } of clickPatterns) {
    const match = description.match(pattern);
    if (match) {
      const buttonText = element || match[1];
      steps.push({
        action: "click",
        locator: { type: "role", role: "button", name: buttonText }
      });
      break; // Only add one click action per description
    }
  }
}

function parseAssertions(description: string, steps: TestStep[]): void {
  const assertionPatterns = [
    // Error/failure patterns
    { 
      pattern: /(?:shows?|displays?|contains?|see)\s+(?:an?\s+)?(?:error|warning|failure)\s*(?:message)?/i, 
      assertion: { type: "containsText" as const, locator: { type: "css", value: "[role='alert'], .error, .warning, .alert-error" }, value: "error" }
    },
    { 
      pattern: /(?:expect|should\s+see)\s+(?:an?\s+)?error/i, 
      assertion: { type: "containsText" as const, locator: { type: "css", value: "[role='alert'], .error, .warning" }, value: "error" }
    },
    
    // Success patterns
    { 
      pattern: /(?:redirect|navigate|go|taken)\s+to\s+(?:the\s+)?dashboard/i, 
      assertion: { type: "urlContains" as const, value: "/dashboard" }
    },
    { 
      pattern: /(?:redirect|navigate|go|taken)\s+to\s+(?:the\s+)?home/i, 
      assertion: { type: "urlContains" as const, value: "/" }
    },
    { 
      pattern: /(?:see|sees)\s+(?:the\s+)?dashboard/i, 
      assertion: { type: "urlContains" as const, value: "/dashboard" }
    },
    { 
      pattern: /(?:success|successful|succeed)/i, 
      assertion: { type: "containsText" as const, locator: { type: "css", value: ".success, [role='status'], .alert-success" }, value: "success" }
    },
    
    // Custom text patterns with exact extraction
    { 
      pattern: /(?:shows?|displays?|contains?|see)\s+['"']([^'"]+)['"']/i, 
      assertion: null // Will be set based on match
    },
    { 
      pattern: /(?:expect|should\s+see)\s+['"']([^'"]+)['"']/i, 
      assertion: null // Will be set based on match
    },
    
    // URL patterns
    { 
      pattern: /(?:url|address)\s+(?:contains?|includes?)\s+['"']([^'"]+)['"']/i, 
      assertion: null // Will be URL assertion
    }
  ];

  for (const { pattern, assertion } of assertionPatterns) {
    const match = description.match(pattern);
    if (match) {
      if (assertion) {
        steps.push({ action: "assert", assertion });
      } else if (match[1]) {
        // Determine assertion type based on pattern
        if (pattern.source.includes('url|address')) {
          // URL assertion
          steps.push({
            action: "assert",
            assertion: {
              type: "urlContains",
              value: match[1]
            }
          });
        } else {
          // Text assertion with exact value
          steps.push({
            action: "assert",
            assertion: {
              type: "containsText",
              locator: { type: "css", value: "body" },
              value: match[1]
            }
          });
        }
      }
      break; // Only add one assertion per description
    }
  }
}

function getDefaultValue(field: string, description: string, testData?: Record<string, string>): string {
  // STRICT MODE: Use test data if provided, otherwise return TODO
  if (testData && testData[field]) {
    return testData[field];
  }
  
  // STRICT MODE: Never invent values, always return TODO
  return `// TODO: Specify ${field} value`;
}

function extractTags(description: string): string[] {
  const tags: string[] = [];
  
  if (/login|signin/i.test(description)) tags.push('authentication');
  if (/register|signup/i.test(description)) tags.push('registration');
  if (/error|fail/i.test(description)) tags.push('negative');
  if (/success|pass/i.test(description)) tags.push('positive');
  if (/form/i.test(description)) tags.push('form');
  
  return tags;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Create a test data replacement utility
 */
export function replaceTestDataPlaceholders(testCase: TestCase, realData: Record<string, string>): TestCase {
  const replacedSteps = testCase.steps.map(step => {
    if (step.text) {
      let replacedText = step.text;
      Object.entries(realData).forEach(([key, value]) => {
        const placeholder = `{{${key.toUpperCase()}}}`;
        replacedText = replacedText.replace(new RegExp(placeholder, 'g'), value);
      });
      return { ...step, text: replacedText };
    }
    return step;
  });

  return {
    ...testCase,
    steps: replacedSteps
  };
}

/**
 * Enhanced example test case templates (with placeholders for real data)
 */
export const exampleTestCases = [
  {
    description: "User logs in with valid credentials and sees dashboard",
    url: "{{BASE_URL}}"
  },
  {
    description: "Login with wrong password shows error message", 
    url: "{{BASE_URL}}"
  },
  {
    description: "User registers with valid email and gets success confirmation",
    url: "{{BASE_URL}}"
  },
  {
    description: "Submit contact form and verify thank you message appears",
    url: "{{BASE_URL}}"
  },
  {
    description: "Navigate to profile page and update user information",
    url: "{{BASE_URL}}"
  }
];