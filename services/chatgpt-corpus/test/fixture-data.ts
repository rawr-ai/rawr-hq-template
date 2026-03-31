import type { RawSourceMaterials } from "../src/service/shared/workspace-store";

export const FIXTURE_SOURCE_MATERIALS: RawSourceMaterials = {
  conversations: [
    {
      relativePath: "source-material/conversations/raw-json/Alpha Architecture Branch 01 Duplicate.json",
      contents: `{
  "metadata": {
    "title": "Branch · Alpha Architecture",
    "link": "https://chatgpt.com/c/alpha-branch",
    "dates": {
      "created": "3/01/2026 09:35:00",
      "updated": "3/01/2026 09:45:00",
      "exported": "3/01/2026 10:07:00"
    }
  },
  "messages": [
    {
      "role": "Prompt",
      "say": "How should host shells work?"
    },
    {
      "role": "Response",
      "say": "Start with a small workspace and derive outputs carefully."
    },
    {
      "role": "Prompt",
      "say": "Should the flow be deterministic?"
    },
    {
      "role": "Response",
      "say": "Yes, and one exporter note says tokens truncated for a prior branch."
    },
    {
      "role": "Prompt",
      "say": "What should happen next?"
    },
    {
      "role": "Response",
      "say": "Group families and write normalized threads."
    }
  ]
}
`,
    },
    {
      relativePath: "source-material/conversations/raw-json/Alpha Architecture Branch 01.json",
      contents: `{
  "metadata": {
    "title": "Branch · Alpha Architecture",
    "link": "https://chatgpt.com/c/alpha-branch",
    "dates": {
      "created": "3/01/2026 09:30:00",
      "updated": "3/01/2026 09:45:00",
      "exported": "3/01/2026 10:05:00"
    }
  },
  "messages": [
    {
      "role": "Prompt",
      "say": "How should host shells work?"
    },
    {
      "role": "Response",
      "say": "Start with a small workspace and derive outputs carefully."
    },
    {
      "role": "Prompt",
      "say": "Should the flow be deterministic?"
    },
    {
      "role": "Response",
      "say": "Yes, and one exporter note says tokens truncated for a prior branch."
    },
    {
      "role": "Prompt",
      "say": "What should happen next?"
    },
    {
      "role": "Response",
      "say": "Group families and write normalized threads."
    }
  ]
}
`,
    },
    {
      relativePath: "source-material/conversations/raw-json/Alpha Architecture.json",
      contents: `{
  "metadata": {
    "title": "Alpha Architecture",
    "link": "https://chatgpt.com/c/alpha-root",
    "dates": {
      "created": "3/01/2026 09:00:00",
      "updated": "3/01/2026 09:15:00",
      "exported": "3/01/2026 10:00:00"
    }
  },
  "messages": [
    {
      "role": "Prompt",
      "say": "How should host shells work?"
    },
    {
      "role": "Response",
      "say": "Start with a small workspace and derive outputs carefully."
    },
    {
      "role": "Prompt",
      "say": "Should the flow be deterministic?"
    },
    {
      "role": "Response",
      "say": "Yes, and one exporter note says tokens truncated for a prior branch."
    }
  ]
}
`,
    },
    {
      relativePath: "source-material/conversations/raw-json/Telemetry vs Logging.json",
      contents: `{
  "metadata": {
    "title": "Telemetry vs Logging",
    "link": "https://chatgpt.com/c/telemetry-root",
    "dates": {
      "created": "3/02/2026 11:00:00",
      "updated": "3/02/2026 11:15:00",
      "exported": "3/02/2026 12:00:00"
    }
  },
  "messages": [
    {
      "role": "Prompt",
      "say": "What is the difference between telemetry and logging?"
    },
    {
      "role": "Response",
      "say": "Telemetry is broader than logs."
    },
    {
      "role": "Prompt",
      "say": "Can you summarize the practical implication?"
    },
    {
      "role": "Response",
      "say": ""
    }
  ]
}
`,
    },
  ],
  documents: [
    {
      relativePath: "work/docs/source/Architecture Notes.md",
      contents: `# Architecture Notes

This Markdown note should be inventoried alongside the raw ChatGPT exports.

## Purpose

Keep one small source document in the workspace to prove optional docs are included.
`,
    },
  ],
};
