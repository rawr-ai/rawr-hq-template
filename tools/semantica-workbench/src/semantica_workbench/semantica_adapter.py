from __future__ import annotations

import contextlib
import importlib.metadata
import io
from typing import Any


def semantica_status() -> dict[str, Any]:
    try:
        import semantica
        from semantica.ontology import OntologyEngine

        return {
            "available": True,
            "version": importlib.metadata.version("semantica"),
            "module": getattr(semantica, "__file__", None),
            "ontology_engine": f"{OntologyEngine.__module__}.{OntologyEngine.__name__}",
        }
    except Exception as exc:
        return {"available": False, "error": str(exc)}


def generate_semantica_ontology(classes: list[str], properties: list[str]) -> dict[str, Any]:
    status = semantica_status()
    if not status.get("available"):
        return status

    from semantica.ontology import OntologyEngine

    payload = {
        "classes": [{"name": name} for name in classes],
        "properties": [{"name": name} for name in properties],
    }
    stream = io.StringIO()
    try:
        with contextlib.redirect_stdout(stream):
            generated = OntologyEngine().from_data(payload)
        return {
            **status,
            "from_data": {
                "class_count": len(generated.get("classes", [])),
                "property_count": len(generated.get("properties", [])),
                "metadata": generated.get("metadata", {}),
            },
            "stdout": stream.getvalue().strip()[:1000],
        }
    except Exception as exc:
        return {**status, "from_data_error": str(exc), "stdout": stream.getvalue().strip()[:1000]}
