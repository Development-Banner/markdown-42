import * as assert from 'assert';
import { parseBlocks, serializeBlocks } from '../../src/parser/blockParser';

suite('blockParser', () => {
  suite('parseBlocks', () => {
    test('splits two paragraphs at double newline', () => {
      const blocks = parseBlocks('Para one\n\nPara two');
      assert.strictEqual(blocks.length, 2);
      assert.strictEqual(blocks[0].raw, 'Para one');
      assert.strictEqual(blocks[1].raw, 'Para two');
    });

    test('single paragraph has no split', () => {
      const blocks = parseBlocks('Just one paragraph');
      assert.strictEqual(blocks.length, 1);
    });

    test('detects heading type', () => {
      const blocks = parseBlocks('# Hello');
      assert.strictEqual(blocks[0].type, 'heading');
    });

    test('detects paragraph type', () => {
      const blocks = parseBlocks('Just text');
      assert.strictEqual(blocks[0].type, 'paragraph');
    });

    test('detects fence type', () => {
      const blocks = parseBlocks('```\ncode\n```');
      assert.strictEqual(blocks[0].type, 'fence');
    });

    test('detects list type', () => {
      const blocks = parseBlocks('- item one\n- item two');
      assert.strictEqual(blocks[0].type, 'list');
    });

    test('detects blockquote type', () => {
      const blocks = parseBlocks('> quote text');
      assert.strictEqual(blocks[0].type, 'blockquote');
    });

    test('detects table type', () => {
      const blocks = parseBlocks('| A | B |\n|---|---|\n| 1 | 2 |');
      assert.strictEqual(blocks[0].type, 'table');
    });

    test('does not split inside fenced code block', () => {
      const blocks = parseBlocks('```\nline1\n\nline2\n```');
      assert.strictEqual(blocks.length, 1, 'Fence with internal blank should be 1 block');
    });

    test('does not split tilde fenced code block', () => {
      const blocks = parseBlocks('~~~\nline1\n\nline2\n~~~');
      assert.strictEqual(blocks.length, 1);
    });

    test('keeps table rows in one block', () => {
      const table = '| H1 | H2 |\n|----|----||\n| A  | B  |\n| C  | D  |';
      const blocks = parseBlocks(table);
      assert.strictEqual(blocks.length, 1, 'Table should be a single block');
    });

    test('assigns startLine correctly', () => {
      const blocks = parseBlocks('# Heading\n\nParagraph');
      assert.strictEqual(blocks[0].startLine, 0);
      assert.strictEqual(blocks[1].startLine, 2);
    });

    test('assigns sequential indices', () => {
      const blocks = parseBlocks('A\n\nB\n\nC');
      assert.strictEqual(blocks[0].index, 0);
      assert.strictEqual(blocks[1].index, 1);
      assert.strictEqual(blocks[2].index, 2);
    });

    test('handles empty string', () => {
      const blocks = parseBlocks('');
      assert.strictEqual(blocks.length, 0);
    });

    test('handles only whitespace', () => {
      const blocks = parseBlocks('   \n\n   ');
      assert.strictEqual(blocks.length, 0);
    });

    test('handles multiple blank lines between blocks', () => {
      const blocks = parseBlocks('A\n\n\n\nB');
      assert.strictEqual(blocks.length, 2);
    });
  });

  suite('serializeBlocks — roundtrip', () => {
    test('serialize(parse(x)) produces same content for heading + paragraph', () => {
      const md = '# Heading\n\nParagraph';
      const roundtripped = serializeBlocks(parseBlocks(md));
      // Content should be equivalent (double-newline separated)
      assert.ok(roundtripped.includes('# Heading'));
      assert.ok(roundtripped.includes('Paragraph'));
    });

    test('serialize(parse(x)) for list keeps list intact', () => {
      const md = '- item one\n- item two\n- item three';
      const blocks = parseBlocks(md);
      const result = serializeBlocks(blocks);
      assert.ok(result.includes('item one'));
      assert.ok(result.includes('item two'));
      assert.ok(result.includes('item three'));
    });

    test('serialize(parse(x)) for fenced code keeps code intact', () => {
      const md = '```typescript\nconst x = 1;\n```';
      const blocks = parseBlocks(md);
      const result = serializeBlocks(blocks);
      assert.ok(result.includes('```typescript'));
      assert.ok(result.includes('const x = 1;'));
    });

    test('empty blocks serialize to empty string', () => {
      assert.strictEqual(serializeBlocks([]), '');
    });

    test('single block serializes to its raw content', () => {
      const blocks = parseBlocks('Hello world');
      const result = serializeBlocks(blocks);
      assert.strictEqual(result.trim(), 'Hello world');
    });
  });

  suite('Space-aligned table detection', () => {
    test('detects 2-column space-aligned table as table type', () => {
      const md = 'Metric              Target\n------------------- --------\nInstall count       100K\nDaily active users  20%';
      const blocks = parseBlocks(md);
      assert.strictEqual(blocks.length, 1);
      assert.strictEqual(blocks[0].type, 'table');
    });

    test('detects 3-column space-aligned table as table type', () => {
      const md = 'Name                Role            Department\n------------------- --------------- ----------\nAlice Johnson       Lead Developer  Engineering\nBob Smith           UX Designer     Design';
      const blocks = parseBlocks(md);
      assert.strictEqual(blocks.length, 1);
      assert.strictEqual(blocks[0].type, 'table');
    });

    test('detects 4-column space-aligned table as table type', () => {
      const md = 'Component       P50     P95     P99\n--------------- ------- ------- -------\nAPI latency     45ms    120ms   340ms\nDB query        8ms     35ms    90ms';
      const blocks = parseBlocks(md);
      assert.strictEqual(blocks.length, 1);
      assert.strictEqual(blocks[0].type, 'table');
    });

    test('single dash group is not a table (is hr)', () => {
      const blocks = parseBlocks('---');
      assert.strictEqual(blocks[0].type, 'hr');
    });

    test('paragraph followed by space-aligned table are separate blocks', () => {
      const md = 'Some text above\n\nMetric    Value\n--------- -----\nFoo       Bar';
      const blocks = parseBlocks(md);
      assert.strictEqual(blocks.length, 2);
      assert.strictEqual(blocks[0].type, 'paragraph');
      assert.strictEqual(blocks[1].type, 'table');
    });
  });

  suite('Edge cases', () => {
    test('HR detection', () => {
      const blocks = parseBlocks('---');
      assert.strictEqual(blocks[0].type, 'hr');
    });

    test('ordered list detection', () => {
      const blocks = parseBlocks('1. First\n2. Second');
      assert.strictEqual(blocks[0].type, 'list');
    });

    test('nested content does not confuse parser', () => {
      const md = '## Heading\n\n> Blockquote with `code`\n\n```\nfence\n```';
      const blocks = parseBlocks(md);
      assert.strictEqual(blocks.length, 3);
      assert.strictEqual(blocks[0].type, 'heading');
      assert.strictEqual(blocks[1].type, 'blockquote');
      assert.strictEqual(blocks[2].type, 'fence');
    });
  });
});
