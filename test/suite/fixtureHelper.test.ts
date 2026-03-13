import * as assert from 'assert';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { loadTestCases, getTestCase, assertStripped } from '../helpers/fixtures';

suite('fixture helper', () => {
  let tmpFile: string;

  setup(() => {
    tmpFile = path.join(os.tmpdir(), `md42-fixture-${Date.now()}.md`);
    fs.writeFileSync(tmpFile, [
      '<!-- TEST: block/heading -->',
      '# Hello',
      '<!-- /TEST -->',
      '',
      '<!-- TEST: inline/bold -->',
      '**bold**',
      '<!-- /TEST -->',
    ].join('\n'));
  });

  teardown(() => {
    fs.unlinkSync(tmpFile);
  });

  test('loadTestCases returns map with all case IDs', () => {
    const cases = loadTestCases(tmpFile);
    assert.strictEqual(cases.size, 2);
    assert.ok(cases.has('block/heading'));
    assert.ok(cases.has('inline/bold'));
  });

  test('getTestCase returns trimmed markdown for valid ID', () => {
    const cases = loadTestCases(tmpFile);
    const content = getTestCase(cases, 'block/heading');
    assert.strictEqual(content, '# Hello');
  });

  test('getTestCase throws for unknown ID', () => {
    const cases = loadTestCases(tmpFile);
    assert.throws(
      () => getTestCase(cases, 'nonexistent/case'),
      /Test case not found: nonexistent\/case/
    );
  });

  test('assertStripped passes when forbidden string is absent', () => {
    assert.doesNotThrow(() => assertStripped('<p>hello</p>', '<script>'));
  });

  test('assertStripped throws when forbidden string is present', () => {
    assert.throws(
      () => assertStripped('<script>evil</script>', '<script>'),
      /Expected.*to be stripped/
    );
  });

  test('loadTestCases throws for duplicate fixture ID', () => {
    const dupFile = path.join(os.tmpdir(), `md42-dup-${Date.now()}.md`);
    fs.writeFileSync(dupFile, [
      '<!-- TEST: block/heading -->',
      '# First',
      '<!-- /TEST -->',
      '',
      '<!-- TEST: block/heading -->',
      '# Duplicate',
      '<!-- /TEST -->',
    ].join('\n'));
    try {
      assert.throws(
        () => loadTestCases(dupFile),
        /Duplicate fixture ID: "block\/heading"/
      );
    } finally {
      fs.unlinkSync(dupFile);
    }
  });

  test('loadTestCases throws for non-existent file', () => {
    assert.throws(
      () => loadTestCases('/nonexistent/path/does-not-exist.md'),
      /ENOENT/
    );
  });
});
