export type User = {
  id: number;
  username: string;
  name: string;
  color: string;
};

export type Role = "owner" | "editor" | "viewer";
export type ShareLevel = "editor" | "viewer";

export type Share = { userId: number; level: ShareLevel };

export type ActivityAction = "created" | "viewed" | "edited" | "renamed";

export type ActivityEntry = {
  id: number;
  userId: number;
  action: ActivityAction;
  at: number;
};

/** "rich-text" for documents created here, otherwise the uploaded file's extension. */
export type DocType = string;

export type DocumentSummary = {
  id: number;
  title: string;
  docType: DocType;
  ownerId: number;
  updatedAt: number;
  updatedBy: number | null;
  role: Role;
};

export type DocumentRecord = DocumentSummary & { content: string };
