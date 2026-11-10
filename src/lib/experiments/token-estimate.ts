export function estimatedTokenCost(prompt: string): number {
  const bytes = new TextEncoder().encode(prompt).length;
  return Math.ceil(bytes / 2) + 220;
}
