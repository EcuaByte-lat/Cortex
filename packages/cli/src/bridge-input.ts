export function parseBridgeInput(input: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(input.replace(/^\uFEFF/, ''));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Expected one JSON object on stdin');
  }
  return parsed as Record<string, unknown>;
}
