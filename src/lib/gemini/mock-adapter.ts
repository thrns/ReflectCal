import { ModelAdapter, ModelCallError, ModelGenerationInput, ModelGenerationResult } from "@/lib/gemini/contracts";

export class MockModelAdapter implements ModelAdapter {
  private index = 0;
  readonly inputs: ModelGenerationInput[] = [];

  constructor(private readonly outputs: Array<string | Error>) {}

  async generate(input: ModelGenerationInput): Promise<ModelGenerationResult> {
    this.inputs.push(input);
    const output = this.outputs[this.index++];
    if (output instanceof Error) throw output;
    if (output === undefined) throw new ModelCallError("provider_error", "Mock response sequence exhausted.", false);
    return {
      text: output,
      modelId: "mock-reflectcal-model-v1",
      generationConfig: { temperature: 0, maxOutputTokens: 220, responseMimeType: "application/json" },
      responseMetadata: { mock: true },
      receivedAt: new Date().toISOString(),
      latencyMs: 1,
    };
  }
}
