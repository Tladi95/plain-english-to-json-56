import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Wand2 } from "lucide-react";
import { generateFromPlainEnglish } from "@/core/universal-strict-generator";
import { useToast } from "@/hooks/use-toast";

export function TestGenerator() {
  const [description, setDescription] = useState("try to login with username Sam and password sammy");
  const [baseUrl, setBaseUrl] = useState("https://example.com");
  const [generatedCode, setGeneratedCode] = useState("");
  const [resolvedSteps, setResolvedSteps] = useState<string[]>([]);
  const [extractedValues, setExtractedValues] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!description.trim()) return;
    
    setIsGenerating(true);
    setErrors([]);
    
    try {
      // UNIVERSAL STRICT MODE generation
      const result = generateFromPlainEnglish(description, baseUrl);
      
      setResolvedSteps(result.resolvedSteps);
      setExtractedValues(result.extractedValues);
      setGeneratedCode(result.playwrightCode);
      setErrors(result.errors);
      
      if (result.errors.length === 0) {
        toast({
          title: "Code generated successfully!",
          description: "STRICT MODE validation passed"
        });
      } else {
        toast({
          title: "Validation errors detected",
          description: "Please check the errors below",
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('Generation failed:', error);
      setGeneratedCode(`// Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setErrors([error instanceof Error ? error.message : 'Unknown error']);
      
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const examples = [
    "try to login with username Sam and password sammy",
    "login to https://app.example.com with user Admin and pass admin123, expect dashboard",
    "fill email field with test@example.com and click submit",
    "search for 'laptops' and expect results list",
    "login with wrong password and expect error message"
  ];

  const copyCode = async () => {
    if (!generatedCode) return;
    
    await navigator.clipboard.writeText(generatedCode);
    toast({
      title: "Code copied!",
      description: "Playwright code has been copied to your clipboard"
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            UNIVERSAL STRICT MODE Test Generator
          </h1>
          <p className="text-xl text-muted-foreground">
            Generate exact Playwright tests from plain English with zero deviation tolerance
          </p>
        </div>

        {/* Input Card */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>UNIVERSAL STRICT MODE Test Generator</CardTitle>
            <CardDescription>
              Generate exact Playwright tests from plain English with zero deviation tolerance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Plain English Test Request</label>
              <Textarea
                placeholder="Type your test in plain English..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground">Examples:</p>
                {examples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setDescription(example)}
                    className="block text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Base URL (optional)</label>
              <Textarea
                placeholder="https://example.com (leave empty for // TODO)"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="mt-1"
                rows={1}
              />
            </div>
            
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !description.trim()}
              className="w-full bg-gradient-primary hover:opacity-90"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Exact Playwright Code
                </>
              )}
            </Button>

            {errors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm font-medium text-red-800">Validation Errors:</p>
                {errors.map((error, index) => (
                  <p key={index} className="text-xs text-red-600 mt-1">• {error}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolved Steps Card */}
        {resolvedSteps.length > 0 && (
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Resolved Steps</CardTitle>
              <CardDescription>Exact interpretation of your plain English request</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium">Extracted Values</h4>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(extractedValues).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium">{key}:</span>
                        <span className="text-muted-foreground ml-2">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium">Test Steps</h4>
                  <div className="space-y-2 mt-2">
                    {resolvedSteps.map((step, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generated Code Card */}
        {generatedCode && (
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Generated Playwright Code</CardTitle>
                  <CardDescription>Exact TypeScript test with zero deviations</CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={copyCode}
                  className="border-border hover:border-primary/50"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-code border border-code rounded-lg p-4 text-sm overflow-auto max-h-[600px] shadow-code">
                <code className="text-foreground">
                  {generatedCode}
                </code>
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}