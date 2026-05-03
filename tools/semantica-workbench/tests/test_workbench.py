from __future__ import annotations

import unittest

from semantica_workbench.chunking import chunk_markdown
from semantica_workbench.extraction import heuristic_extract
from semantica_workbench.manifest import load_manifest
from semantica_workbench.paths import FIXTURE_MANIFEST
from semantica_workbench.seeding import build_seed_graph


class WorkbenchTests(unittest.TestCase):
    def test_fixture_manifest_chunks_and_normalizes(self) -> None:
        manifest = load_manifest(FIXTURE_MANIFEST)
        chunks = [chunk for source in manifest.sources for chunk in chunk_markdown(source)]
        self.assertGreaterEqual(len(chunks), 2)

    def test_heuristic_extracts_entities(self) -> None:
        manifest = load_manifest(FIXTURE_MANIFEST)
        seeds = build_seed_graph(manifest)
        chunk = chunk_markdown(manifest.sources[0])[0]
        extraction = heuristic_extract(chunk, seeds)
        self.assertGreater(len(extraction["entity_mentions"]), 1)
        self.assertGreater(len(extraction["claims"]), 0)
        self.assertTrue(all(relation["predicate"] != "mentions" for relation in extraction["relations"]))

    def test_manifest_sources_carry_authority_rank(self) -> None:
        manifest = load_manifest(FIXTURE_MANIFEST)
        self.assertEqual(manifest.sources[0].authority_rank, 99)


if __name__ == "__main__":
    unittest.main()
