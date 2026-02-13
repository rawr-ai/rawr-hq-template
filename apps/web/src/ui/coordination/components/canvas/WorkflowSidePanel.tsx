interface WorkflowSidePanelProps {
  name: string;
  description: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
}

export function WorkflowSidePanel({
  name,
  description,
  onNameChange,
  onDescriptionChange,
}: WorkflowSidePanelProps) {
  return (
    <div className="w-full bg-surface border-l border-border flex flex-col transition-colors duration-200">
      <div className="p-4 flex flex-col gap-4">
        <div>
          <label className="block text-[11px] font-medium text-text-muted uppercase tracking-[0.5px] mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            className="w-full text-[13px] text-text-primary bg-canvas border border-border rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent transition-colors duration-200"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-text-muted uppercase tracking-[0.5px] mb-1">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            className="w-full text-[13px] text-text-primary bg-canvas border border-border rounded-md px-2.5 py-1.5 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors duration-200"
          />
        </div>
      </div>
    </div>
  );
}
