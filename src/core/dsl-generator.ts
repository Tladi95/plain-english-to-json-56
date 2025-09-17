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
    type: "containsText" | "visible" | "urlContains" | "hasValue" | "isEnabled" | "isDisabled";
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
    /(?:go to|navigate to|visit)\s+['"\/]([^'"]+)['"\/]/i,
    /(?:login|signin)\s+page/i,
    /(?:register|signup)\s+page/i,
    /(?:dashboard|profile|settings)\s+page/i
  ];

  for (const pattern of pathPatterns) {
    const match = description.match(pattern);
    if (match) {
      if (pattern.source.includes('login|signin')) return '/login';
      if (pattern.source.includes('register|signup')) return '/register';
      if (pattern.source.includes('dashboard')) return '/dashboard';
      if (pattern.source.includes('profile')) return '/profile';
      if (pattern.source.includes('settings')) return '/settings';
      return match[1] || '/';
    }
  }

  return null;
}

function parseFormInteractions(description: string, steps: TestStep[], testData?: Record<string, string>): void {
  const formPatterns = [
    { pattern: /(?:enter|fill|type|input)\s+(?:username|user\s*name)\s*(?:with\s*)?['"']?([^'"]*)['"']?/i, field: 'username' },
    { pattern: /(?:enter|fill|type|input)\s+(?:password|pass)\s*(?:with\s*)?['"']?([^'"]*)['"']?/i, field: 'password' },
    { pattern: /(?:enter|fill|type|input)\s+(?:email|e-mail)\s*(?:with\s*)?['"']?([^'"]*)['"']?/i, field: 'email' },
    { pattern: /(?:enter|fill|type|input)\s+(?:name|full\s*name)\s*(?:with\s*)?['"']?([^'"]*)['"']?/i, field: 'name' },
    { pattern: /(?:enter|fill|type|input)\s+(?:phone|telephone)\s*(?:with\s*)?['"']?([^'"]*)['"']?/i, field: 'phone' },
    // Generic field pattern for any input
    { pattern: /(?:enter|fill|type|input)\s+(?:the\s+)?([a-zA-Z\s]+?)\s+(?:field|input|box)?\s*(?:with\s*)?['"']?([^'"]*)['"']?/i, field: 'generic' }
  ];

  for (const { pattern, field } of formPatterns) {
    const match = description.match(pattern);
    if (match) {
      let fieldName = field;
      let value = match[1]?.trim();
      
      // Handle generic field pattern
      if (field === 'generic') {
        fieldName = match[1]?.trim().toLowerCase() || 'input';
        value = match[2]?.trim();
      }
      
      // Use provided value or generate placeholder
      const finalValue = value || getDefaultValue(fieldName, description, testData);
      
      // Use multiple locator strategies for better reliability with real pages
      steps.push({
        action: "fill",
        locator: { 
          type: "label" as const, 
          value: capitalizeFirst(fieldName) 
        },
        text: finalValue
      });
    }
  }
}

function parseClickActions(description: string, steps: TestStep[]): void {
  const clickPatterns = [
    { pattern: /(?:click|press|tap)\s+(?:the\s+)?(?:login|signin|log\s*in)\s+(?:button)?/i, element: 'Login' },
    { pattern: /(?:click|press|tap)\s+(?:the\s+)?(?:register|signup|sign\s*up)\s+(?:button)?/i, element: 'Register' },
    { pattern: /(?:click|press|tap)\s+(?:the\s+)?(?:submit|send)\s+(?:button)?/i, element: 'Submit' },
    { pattern: /(?:click|press|tap)\s+(?:the\s+)?(?:save|update)\s+(?:button)?/i, element: 'Save' },
    { pattern: /(?:click|press|tap)\s+(?:the\s+)?(?:cancel|close)\s+(?:button)?/i, element: 'Cancel' },
    { pattern: /(?:click|press|tap)\s+(?:the\s+)?['"']([^'"]+)['"']/i, element: null } // Custom button text
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
    { 
      pattern: /(?:shows?|displays?|contains?)\s+(?:error|warning)\s*(?:message)?/i, 
      assertion: { type: "containsText" as const, locator: { type: "css", value: "[role='alert'], .error, .warning" }, value: "error" }
    },
    { 
      pattern: /(?:redirect|navigate|go)\s+to\s+(?:the\s+)?dashboard/i, 
      assertion: { type: "urlContains" as const, value: "/dashboard" }
    },
    { 
      pattern: /(?:redirect|navigate|go)\s+to\s+(?:the\s+)?home/i, 
      assertion: { type: "urlContains" as const, value: "/" }
    },
    { 
      pattern: /(?:success|successful)/i, 
      assertion: { type: "containsText" as const, locator: { type: "css", value: ".success, [role='status']" }, value: "success" }
    },
    { 
      pattern: /(?:shows?|displays?)\s+['"']([^'"]+)['"']/i, 
      assertion: null // Will be set based on match
    }
  ];

  for (const { pattern, assertion } of assertionPatterns) {
    const match = description.match(pattern);
    if (match) {
      if (assertion) {
        steps.push({ action: "assert", assertion });
      } else if (match[1]) {
        // Custom text assertion
        steps.push({
          action: "assert",
          assertion: {
            type: "containsText",
            locator: { type: "css", value: "body" },
            value: match[1]
          }
        });
      }
      break; // Only add one assertion per description
    }
  }
}

function getDefaultValue(field: string, description: string, testData?: Record<string, string>): string {
  const isInvalid = /(?:wrong|invalid|incorrect|bad|failed?)/i.test(description);
  
  // Use provided test data first, then fallback to contextual defaults
  if (testData && testData[field]) {
    return isInvalid ? `invalid_${testData[field]}` : testData[field];
  }
  
  // Generate contextual values based on field type
  const generateValue = (fieldType: string, invalid: boolean = false) => {
    switch (fieldType) {
      case 'username':
        return invalid ? '{{INVALID_USERNAME}}' : '{{USERNAME}}';
      case 'password':
        return invalid ? '{{INVALID_PASSWORD}}' : '{{PASSWORD}}';
      case 'email':
        return invalid ? '{{INVALID_EMAIL}}' : '{{EMAIL}}';
      case 'name':
        return '{{FULL_NAME}}';
      case 'phone':
        return '{{PHONE_NUMBER}}';
      default:
        return `{{${fieldType.toUpperCase()}}}`;
    }
  };
  
  return generateValue(field, isInvalid);
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