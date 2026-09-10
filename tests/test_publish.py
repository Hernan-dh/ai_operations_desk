import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "publish.py"
SPEC = importlib.util.spec_from_file_location("publish", MODULE_PATH)
publish = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(publish)


class PublishTests(unittest.TestCase):
    def test_accepts_valid_conventional_commit(self):
        result = publish.validate_proposal("feat: add request routing", "Adds an auditable routing workflow.")
        self.assertEqual(result[0], "feat: add request routing")

    def test_rejects_invalid_title(self):
        with self.assertRaises(ValueError):
            publish.validate_proposal("Added a feature", "Description")

    def test_parses_json_from_fenced_response(self):
        title, description = publish.parse_proposal(
            '```json\n{"title":"docs: explain publishing", "description":"Documents safe publishing."}\n```'
        )
        self.assertEqual(title, "docs: explain publishing")
        self.assertEqual(description, "Documents safe publishing.")

    def test_truncates_generated_description(self):
        title, description = publish.parse_proposal(
            '{"title":"feat: add publishing", "description":"' + ("a" * 600) + '"}'
        )
        self.assertEqual(title, "feat: add publishing")
        self.assertEqual(len(description), 500)
        self.assertTrue(description.endswith("..."))

    def test_provider_order_is_gemini_groq_openrouter(self):
        environment = {
            "GEMINI_API_KEY": "gemini-test",
            "GEMINI_COMMIT_MODELS": "gemini-test-model",
            "GROQ_API_KEY": "groq-test",
            "GROQ_COMMIT_MODEL": "groq-test-model",
            "OPENROUTER_API_KEY": "openrouter-test",
            "OPENROUTER_COMMIT_MODELS": "openrouter-test-model",
        }
        with patch.dict(os.environ, environment, clear=True):
            labels = [label for label, _ in publish.configured_attempts("prompt", 1)]
        self.assertEqual(labels, [
            "Gemini/gemini-test-model",
            "Groq/groq-test-model",
            "OpenRouter/openrouter-test-model",
            "OpenRouter/openrouter/free",
        ])

    def test_openrouter_model_alias_is_supported(self):
        environment = {
            "OPENROUTER_API_KEY": "openrouter-test",
            "OPENROUTER_MODEL": "nvidia/nemotron-test:free",
        }
        with patch.dict(os.environ, environment, clear=True):
            labels = [label for label, _ in publish.configured_attempts("prompt", 1)]
        self.assertEqual(labels, [
            "OpenRouter/nvidia/nemotron-test:free",
            "OpenRouter/openrouter/free",
        ])


if __name__ == "__main__":
    unittest.main()
