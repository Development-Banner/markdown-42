import * as fs from 'fs';

/**
 * Parses a fixture file containing <!-- TEST: id -->...<!-- /TEST --> blocks.
 * Returns a map of case ID → trimmed markdown content.
 */
export function loadTestCases(fixturePath: string): Map<string, string> {
  const content = fs.readFileSync(fixturePath, 'utf-8');
  const map = new Map<string, string>();
  const regex = /<!--\s*TEST:\s*([\w\-/]+)\s*-->([\s\S]*?)<!--\s*\/TEST\s*-->/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    map.set(match[1].trim(), match[2].trim());
  }
  return map;
}

/**
 * Returns the markdown content for a case ID. Throws if not found.
 */
export function getTestCase(cases: Map<string, string>, id: string): string {
  const content = cases.get(id);
  if (content === undefined) {
    throw new Error(`Test case not found: ${id}`);
  }
  return content;
}

/**
 * Asserts that `forbidden` does not appear in `html`. Throws with a clear
 * message if it does, so tests fail descriptively.
 */
export function assertStripped(html: string, forbidden: string): void {
  if (html.includes(forbidden)) {
    throw new Error(
      `Expected "${forbidden}" to be stripped from output, but found it in:\n${html}`
    );
  }
}
