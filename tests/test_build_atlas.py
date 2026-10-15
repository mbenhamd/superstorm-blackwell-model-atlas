"""Regression checks for offline document links, escaping and source provenance."""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import unittest

from scripts import build_atlas


class OfflineAtlasTests(unittest.TestCase):
    def test_relative_document_and_asset_links(self):
        source = Path('companies/example/README.md')
        documents = {source, Path('reports/comparison.md')}
        rendered = build_atlas.inline(
            '[report](../../reports/comparison.md#memory) [config](model.json) [local](#details)',
            source, documents)
        self.assertIn('href="#doc-reports-comparison-md--memory"', rendered)
        self.assertIn('href="companies/example/model.json"', rendered)
        self.assertIn('href="#doc-companies-example-README-md--details"', rendered)

    def test_code_and_html_are_escaped(self):
        rendered = build_atlas.render_markdown(
            '# Heading\n\n<script>bad()</script> and `a < b`\n\n```python\nprint("<tag>")\n```\n',
            Path('README.md'), {Path('README.md')})
        self.assertNotIn('<script>', rendered)
        self.assertIn('<code>a &lt; b</code>', rendered)
        self.assertIn('print(&quot;&lt;tag&gt;&quot;)', rendered)

    def test_table_lists_and_duplicate_headings(self):
        rendered = build_atlas.render_markdown(
            '# Same\n\n# Same\n\n| Key | Value |\n| --- | --- |\n| **A** | `B` |\n\n- one\n- two\n',
            Path('README.md'), {Path('README.md')})
        self.assertIn('id="doc-README-md--same-1"', rendered)
        self.assertIn('<td><strong>A</strong></td><td><code>B</code></td>', rendered)
        self.assertIn('<ul>\n<li>one</li>\n<li>two</li>\n</ul>', rendered)

    def test_generated_sources_and_internal_links(self):
        result = build_atlas.build()
        hashes = json.loads(re.search(r'id="source-hashes">(.*?)</script>', result, re.S)[1])
        for name, digest in hashes.items():
            self.assertEqual(digest, hashlib.sha256((build_atlas.ROOT / name).read_bytes()).hexdigest())

        class Links(HTMLParser):
            def __init__(self):
                super().__init__()
                self.ids = set()
                self.targets = []
                self.duplicates = []

            def handle_starttag(self, tag, attrs):
                attrs = dict(attrs)
                if 'id' in attrs:
                    if attrs['id'] in self.ids:
                        self.duplicates.append(attrs['id'])
                    self.ids.add(attrs['id'])
                if tag == 'a' and attrs.get('href', '').startswith('#'):
                    self.targets.append(attrs['href'][1:])

        parser = Links()
        parser.feed(result)
        self.assertFalse(parser.duplicates)
        self.assertFalse(set(parser.targets) - parser.ids)


if __name__ == '__main__':
    unittest.main()
