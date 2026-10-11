export type User = {
  id: number;
  username: string;
  name: string;
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

/** A document as seen by one user; `role` is null when they have no access. */
export type DocumentForUser = Omit<DocumentSummary, "role"> & {
  role: Role | null;
  content: string;
};

export type NewDocument = {
  title: string;
  content: string;
  docType: DocType;
  originalFileName: string | null;
  filePath: string | null;
};
