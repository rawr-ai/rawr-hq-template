from __future__ import annotations

import contextlib
import importlib.metadata
import io
import json
from pathlib import Path
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


def export_semantica_ontology(entities: list[dict[str, Any]], relations: list[dict[str, Any]], run_dir: Path) -> dict[str, Any]:
    status = semantica_status()
    result: dict[str, Any] = {
        **status,
        "entity_count": len(entities),
        "relation_count": len(relations),
        "outputs": {},
        "operations": {},
    }
    if not status.get("available"):
        return result

    from semantica.ontology import OntologyEngine

    payload = {
        "classes": [{"name": name} for name in sorted({entity["type"] for entity in entities})],
        "properties": [{"name": name} for name in sorted({relation["predicate"] for relation in relations})],
        "entities": [
            {
                "id": entity["id"],
                "label": entity.get("label"),
                "type": entity.get("type"),
                "layer": entity.get("layer"),
                "status": entity.get("status"),
            }
            for entity in entities
        ],
        "relations": [
            {
                "id": relation["id"],
                "subject": relation["subject"],
                "predicate": relation["predicate"],
                "object": relation["object"],
                "layer": relation.get("layer"),
                "status": relation.get("status"),
            }
            for relation in relations
        ],
        "metadata": {
            "source": "rawr-core-architecture-reviewed-ontology",
            "truth_model": "reviewed_yaml_authoritative_semantica_substrate",
        },
    }

    engine = OntologyEngine()
    stream = io.StringIO()
    generated: Any = None
    try:
        with contextlib.redirect_stdout(stream):
            generated = engine.from_data(payload)
        result["operations"]["from_data"] = {"ok": True}
        ontology_path = run_dir / "semantica-ontology.json"
        ontology_path.write_text(json.dumps(jsonable(generated), indent=2, sort_keys=True) + "\n", encoding="utf-8")
        result["outputs"]["ontology_json"] = str(ontology_path)
    except Exception as exc:
        result["operations"]["from_data"] = {"ok": False, "error": str(exc)}
    result["stdout"] = stream.getvalue().strip()[:4000]

    if generated is None:
        return result

    result["operations"]["validate"] = call_engine(engine, "validate", generated)
    result["operations"]["evaluate"] = call_engine(engine, "evaluate", generated)
    data_graph = to_data_graph_turtle(entities, relations)
    data_graph_path = run_dir / "semantica-data-graph.ttl"
    data_graph_path.write_text(data_graph, encoding="utf-8")
    result["outputs"]["data_graph_ttl"] = str(data_graph_path)
    result["operations"]["validate_graph"] = call_engine_kwargs(
        engine,
        "validate_graph",
        data_graph,
        ontology=generated,
        data_graph_format="turtle",
    )

    owl = call_engine(engine, "to_owl", generated)
    result["operations"]["to_owl"] = owl
    if owl.get("ok") and isinstance(owl.get("value"), str):
        owl_path = run_dir / "semantica-ontology.owl"
        owl_path.write_text(owl["value"], encoding="utf-8")
        result["outputs"]["owl"] = str(owl_path)

    shacl = call_engine(engine, "to_shacl", generated)
    result["operations"]["to_shacl"] = shacl
    if shacl.get("ok") and isinstance(shacl.get("value"), str):
        shacl_path = run_dir / "semantica-ontology.shacl.ttl"
        shacl_path.write_text(shacl["value"], encoding="utf-8")
        result["outputs"]["shacl"] = str(shacl_path)

    return result


def call_engine(engine: Any, method_name: str, payload: Any) -> dict[str, Any]:
    method = getattr(engine, method_name, None)
    if not callable(method):
        return {"ok": False, "available": False}
    stream = io.StringIO()
    try:
        with contextlib.redirect_stdout(stream):
            value = method(payload)
        return {"ok": True, "value": jsonable(value), "stdout": stream.getvalue().strip()[:1000]}
    except Exception as exc:
        return {"ok": False, "available": True, "error": str(exc), "stdout": stream.getvalue().strip()[:1000]}


def call_engine_kwargs(engine: Any, method_name: str, *args: Any, **kwargs: Any) -> dict[str, Any]:
    method = getattr(engine, method_name, None)
    if not callable(method):
        return {"ok": False, "available": False}
    stream = io.StringIO()
    try:
        with contextlib.redirect_stdout(stream):
            value = method(*args, **kwargs)
        return {"ok": True, "value": jsonable(value), "stdout": stream.getvalue().strip()[:1000]}
    except Exception as exc:
        return {"ok": False, "available": True, "error": str(exc), "stdout": stream.getvalue().strip()[:1000]}


def to_data_graph_turtle(entities: list[dict[str, Any]], relations: list[dict[str, Any]]) -> str:
    lines = [
        "@prefix rawr: <https://rawr.dev/ontology/> .",
        "@prefix sem: <https://semantica.dev/ontology/> .",
        "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .",
        "",
    ]
    for entity in entities:
        node = iri_fragment(entity["id"])
        entity_type = iri_fragment(entity.get("type", "Concept"))
        label = turtle_literal(str(entity.get("label") or entity["id"]))
        lines.append(f"rawr:{node} a sem:{entity_type} ;")
        lines.append(f"  rdfs:label {label} .")
        lines.append("")
    for relation in relations:
        subject = iri_fragment(relation["subject"])
        predicate = iri_fragment(relation["predicate"])
        obj = iri_fragment(relation["object"])
        lines.append(f"rawr:{subject} rawr:{predicate} rawr:{obj} .")
    return "\n".join(lines) + "\n"


def iri_fragment(value: str) -> str:
    return "".join(character if character.isalnum() else "_" for character in str(value)).strip("_") or "item"


def turtle_literal(value: str) -> str:
    return json.dumps(value)


def jsonable(value: Any) -> Any:
    try:
        json.dumps(value)
        return value
    except TypeError:
        if isinstance(value, dict):
            return {str(key): jsonable(item) for key, item in value.items()}
        if isinstance(value, (list, tuple, set)):
            return [jsonable(item) for item in value]
        return repr(value)
