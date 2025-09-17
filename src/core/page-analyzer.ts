/**
 * Page analyzer for extracting real form fields and elements from actual pages
 */

export interface PageElement {
  type: 'input' | 'button' | 'link' | 'text' | 'select';
  selector: string;
  label?: string;
  placeholder?: string;
  id?: string;
  name?: string;
  role?: string;
  text?: string;
}

export interface PageAnalysis {
  url: string;
  title: string;
  elements: PageElement[];
  forms: {
    selector: string;
    fields: PageElement[];
    submitButton?: PageElement;
  }[];
}

/**
 * Generate more accurate locators based on real page analysis
 */
export function generateSmartLocator(element: PageElement): {
  type: "label" | "id" | "role" | "text" | "css" | "xpath";
  value?: string;
  role?: string;
  name?: string;
} {
  // Prioritize most reliable selectors
  if (element.id) {
    return { type: "id", value: element.id };
  }
  
  if (element.name) {
    return { type: "css", value: `[name="${element.name}"]` };
  }
  
  if (element.label) {
    return { type: "label", value: element.label };
  }
  
  if (element.role) {
    return { type: "role", role: element.role, name: element.text };
  }
  
  if (element.text && element.type === 'button') {
    return { type: "role", role: "button", name: element.text };
  }
  
  if (element.placeholder) {
    return { type: "css", value: `[placeholder="${element.placeholder}"]` };
  }
  
  // Fallback to CSS selector
  return { type: "css", value: element.selector };
}

/**
 * Extract form field information from natural language and match with real page elements
 */
export function matchFieldToPageElement(
  fieldDescription: string, 
  pageElements: PageElement[]
): PageElement | null {
  const normalizedField = fieldDescription.toLowerCase().trim();
  
  // Direct field name matches
  const directMatches = pageElements.filter(el => {
    if (!el.name && !el.id && !el.label && !el.placeholder) return false;
    
    const searchableText = [
      el.name?.toLowerCase(),
      el.id?.toLowerCase(), 
      el.label?.toLowerCase(),
      el.placeholder?.toLowerCase()
    ].filter(Boolean).join(' ');
    
    return searchableText.includes(normalizedField);
  });
  
  if (directMatches.length > 0) {
    return directMatches[0];
  }
  
  // Semantic matching for common field types
  const semanticMatches: Record<string, string[]> = {
    username: ['username', 'user', 'login', 'userid', 'user_name'],
    password: ['password', 'pass', 'pwd', 'secret'],
    email: ['email', 'e-mail', 'mail', 'email_address'],
    name: ['name', 'full_name', 'fullname', 'first_name', 'last_name'],
    phone: ['phone', 'telephone', 'mobile', 'cell', 'number'],
    address: ['address', 'street', 'location'],
    city: ['city', 'town'],
    zip: ['zip', 'postal', 'zipcode', 'postcode'],
    country: ['country', 'nation'],
    state: ['state', 'province', 'region']
  };
  
  for (const [fieldType, keywords] of Object.entries(semanticMatches)) {
    if (keywords.some(keyword => normalizedField.includes(keyword))) {
      const match = pageElements.find(el => {
        const searchableText = [
          el.name?.toLowerCase(),
          el.id?.toLowerCase(),
          el.label?.toLowerCase(),
          el.placeholder?.toLowerCase()
        ].filter(Boolean).join(' ');
        
        return keywords.some(keyword => searchableText.includes(keyword));
      });
      
      if (match) return match;
    }
  }
  
  return null;
}

/**
 * Generate test data placeholders that can be replaced with real values
 */
export function generateDataPlaceholder(fieldType: string, isInvalid: boolean = false): string {
  const placeholders: Record<string, { valid: string; invalid: string }> = {
    username: { valid: '{{TEST_USERNAME}}', invalid: '{{INVALID_USERNAME}}' },
    password: { valid: '{{TEST_PASSWORD}}', invalid: '{{INVALID_PASSWORD}}' },
    email: { valid: '{{TEST_EMAIL}}', invalid: '{{INVALID_EMAIL}}' },
    name: { valid: '{{TEST_NAME}}', invalid: '{{INVALID_NAME}}' },
    phone: { valid: '{{TEST_PHONE}}', invalid: '{{INVALID_PHONE}}' },
    address: { valid: '{{TEST_ADDRESS}}', invalid: '{{INVALID_ADDRESS}}' },
    city: { valid: '{{TEST_CITY}}', invalid: '{{INVALID_CITY}}' },
    zip: { valid: '{{TEST_ZIP}}', invalid: '{{INVALID_ZIP}}' },
    country: { valid: '{{TEST_COUNTRY}}', invalid: '{{INVALID_COUNTRY}}' },
    state: { valid: '{{TEST_STATE}}', invalid: '{{INVALID_STATE}}' }
  };
  
  const placeholder = placeholders[fieldType.toLowerCase()];
  if (placeholder) {
    return isInvalid ? placeholder.invalid : placeholder.valid;
  }
  
  // Generic placeholder for unknown field types
  const genericField = fieldType.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return isInvalid ? `{{INVALID_${genericField}}}` : `{{TEST_${genericField}}}`;
}

/**
 * Create a test data template based on detected form fields
 */
export function createPageDataTemplate(pageAnalysis: PageAnalysis): Record<string, string> {
  const template: Record<string, string> = {};
  
  pageAnalysis.forms.forEach(form => {
    form.fields.forEach(field => {
      if (field.type === 'input') {
        const fieldKey = field.name || field.id || field.label || 'unknown_field';
        template[fieldKey] = generateDataPlaceholder(fieldKey, false);
      }
    });
  });
  
  return template;
}