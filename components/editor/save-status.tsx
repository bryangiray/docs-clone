import type { SaveStatus } from "./use-autosave";

const STATUS_LABEL: Record<SaveStatus, string> = {
  saved: "All changes saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  error: "Save failed",
};

export function SaveStatusLabel({
  status,
  onRetry,
}: {
  status: SaveStatus;
  onRetry: () => void;
}) {
  return (
    <>
      <span
        role="status"
        className={status === "error" ? "text-red-600" : undefined}
      >
        {STATUS_LABEL[status]}
      </span>
      {status === "error" && (
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer text-blue-600 underline"
        >
          Retry
        </button>
      )}
    </>
  );
}
