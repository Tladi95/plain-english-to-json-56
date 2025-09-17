export interface TestStep {
  action: "goto" | "fill" | "click" | "assert";
  path?: string;
  locator?: {
    type?: "label" | "id" | "role" | "text" | "css";
    value?: string;
    role?: string;
    name?: string;
  };
  text?: string;
  assertion?: {
    type: "containsText" | "visible" | "urlContains";
    locator?: {
      type?: string;
      css?: string;
      value?: string;
    };
    value?: string;
  };
}

export interface TestCase {
  meta: {
    name: string;
    baseUrl: string;
  };
  steps: TestStep[];
}

export function generateTestCase(description: string, baseUrl: string): TestCase {
  // Convert description to snake_case for name
  const name = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');

  // Basic parsing logic - this is a simplified version
  // In a real implementation, you'd use more sophisticated NLP
  const steps: TestStep[] = [];

  // Always start with goto
  if (description.toLowerCase().includes('login')) {
    steps.push({ action: "goto", path: "/login" });
  } else {
    steps.push({ action: "goto", path: "/" });
  }

  // Parse common patterns
  if (description.toLowerCase().includes('login') || description.toLowerCase().includes('username')) {
    steps.push({
      action: "fill",
      locator: { type: "label", value: "Username" },
      text: "testuser"
    });
  }

  if (description.toLowerCase().includes('password')) {
    const isWrongPassword = description.toLowerCase().includes('wrong') || 
                           description.toLowerCase().includes('invalid') ||
                           description.toLowerCase().includes('incorrect');
    
    steps.push({
      action: "fill",
      locator: { type: "label", value: "Password" },
      text: isWrongPassword ? "wrongpass" : "correctpass"
    });
  }

  if (description.toLowerCase().includes('click') || description.toLowerCase().includes('submit') || description.toLowerCase().includes('login')) {
    steps.push({
      action: "click",
      locator: { type: "role", role: "button", name: "Login" }
    });
  }

  // Add assertions based on expected outcomes
  if (description.toLowerCase().includes('error') || description.toLowerCase().includes('wrong') || description.toLowerCase().includes('invalid')) {
    steps.push({
      action: "assert",
      assertion: {
        type: "containsText",
        locator: { type: "id", value: "error" },
        value: "Invalid credentials"
      }
    });
  } else if (description.toLowerCase().includes('success') || description.toLowerCase().includes('dashboard')) {
    steps.push({
      action: "assert",
      assertion: {
        type: "urlContains",
        value: "/dashboard"
      }
    });
  }

  return {
    meta: {
      name,
      baseUrl
    },
    steps
  };
}

export const exampleTests = [
  {
    description: "Check login with wrong password shows error",
    url: "https://demo-site.com"
  },
  {
    description: "Verify successful login with correct password", 
    url: "https://app.example.com"
  },
  {
    description: "Test user registration with valid email",
    url: "https://signup.example.com"
  }
];