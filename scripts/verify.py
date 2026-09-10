from html.parser import HTMLParser
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


class DocumentParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.resources = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if "id" in attributes:
            self.ids.add(attributes["id"])
        if tag == "script" and attributes.get("src"):
            self.resources.append(attributes["src"])
        if tag == "link" and attributes.get("href"):
            self.resources.append(attributes["href"])


def main():
    parser = DocumentParser()
    parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    required = {"triageForm", "requestText", "resultPanel", "connectionDialog"}
    errors = [f"Missing element #{item}" for item in sorted(required - parser.ids)]
    for resource in parser.resources:
        if not resource.startswith(("http://", "https://")) and not (ROOT / resource).exists():
            errors.append(f"Missing resource: {resource}")
    for workflow_path in sorted((ROOT / "workflows").glob("*.json")):
        try:
            workflow = json.loads(workflow_path.read_text(encoding="utf-8"))
            if not workflow.get("nodes") or not workflow.get("connections"):
                errors.append(f"Workflow requires nodes and connections: {workflow_path.name}")
            node_names = [node.get("name") for node in workflow.get("nodes", [])]
            if len(node_names) != len(set(node_names)):
                errors.append(f"Workflow node names must be unique: {workflow_path.name}")
            for node in workflow.get("nodes", []):
                if node.get("type") == "@n8n/n8n-nodes-langchain.outputParserStructured":
                    parameters = node.get("parameters", {})
                    version = float(node.get("typeVersion", 0))
                    schema_key = "jsonSchema" if version <= 1.1 else "inputSchema"
                    if not parameters.get(schema_key):
                        errors.append(
                            f"Structured parser {node.get('name')} requires {schema_key} "
                            f"for node version {version}: {workflow_path.name}"
                        )
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"Invalid workflow JSON {workflow_path.name}: {exc}")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print("Verification passed: document resources and n8n workflow are valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
