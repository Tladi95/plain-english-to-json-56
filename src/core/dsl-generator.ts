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
  parseFormInteractions(lowerDesc, steps);
  
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

function parseFormInteractions(description: string, steps: TestStep[]): void {
  const formPatterns = [
    { pattern: /(?:enter|fill|type|input)\s+(?:username|user\s*name|email)\s*(?:with\s*)?['"']?([^'"]*)['"']?/i, field: 'username' },
    { pattern: /(?:enter|fill|type|input)\s+(?:password|pass)\s*(?:with\s*)?['"']?([^'"]*)['"']?/i, field: 'password' },
    { pattern: /(?:enter|fill|type|input)\s+(?:email|e-mail)\s*(?:with\s*)?['"']?([^'"]*)['"']?/i, field: 'email' },
    { pattern: /(?:enter|fill|type|input)\s+(?:name|full\s*name)\s*(?:with\s*)?['"']?([^'"]*)['"']?/i, field: 'name' },
    { pattern: /(?:enter|fill|type|input)\s+(?:phone|telephone)\s*(?:with\s*)?['"']?([^'"]*)['"']?/i, field: 'phone' }
  ];

  for (const { pattern, field } of formPatterns) {
    const match = description.match(pattern);
    if (match) {
      const value = match[1]?.trim() || getDefaultValue(field, description);
      steps.push({
        action: "fill",
        locator: { type: "label", value: capitalizeFirst(field) },
        text: value
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

function getDefaultValue(field: string, description: string): string {
  const isInvalid = /(?:wrong|invalid|incorrect|bad|failed?)/i.test(description);
  
  const defaults = {
    username: isInvalid ? "invaliduser" : "testuser",
    password: isInvalid ? "wrongpass" : "password123",
    email: isInvalid ? "invalid@email" : "test@example.com",
    name: "Test User",
    phone: "555-123-4567"
  };
  
  return defaults[field as keyof typeof defaults] || "test";
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
 * Enhanced example test cases for demonstration
 */
export const exampleTestCases = [
  {
    description: "User logs in with valid credentials and sees dashboard",
    url: "https://app.example.com"
  },
  {
    description: "Login with wrong password shows error message",
    url: "https://app.example.com"
  },
  {
    description: "User registers with valid email and gets success confirmation",
    url: "https://signup.example.com"
  },
  {
    description: "Submit contact form and verify thank you message appears",
    url: "https://contact.example.com"
  },
  {
    description: "Navigate to profile page and update user information",
    url: "https://app.example.com"
  }
];