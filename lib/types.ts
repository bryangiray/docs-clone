export type User = {
  id: number;
  username: string;
  name: string;
};

export type Role = "owner" | "editor" | "commenter" | "viewer";
export type ShareLevel = "editor" | "commenter" | "viewer";

export type Share = { userId: number; level: ShareLevel };

export type ActivityAction =
  | "created"
  | "viewed"
  | "edited"
  | "renamed"
  | "restored";

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

/** A thread's first comment has no `parentId`; replies point at it. */
export type Comment = {
  id: number;
  userId: number;
  parentId: number | null;
  body: string;
  /** The text the comment is about, and roughly where it sat in the document. */
  quote: string | null;
  quoteOffset: number | null;
  resolved: boolean;
  at: number;
};

export type NewComment = {
  body: string;
  quote?: string | null;
  quoteOffset?: number | null;
  parentId?: number | null;
};

/** Someone else who has the document open right now. */
export type Presence = { userId: number; editing: boolean };

export type VersionSummary = { id: number; userId: number; at: number };
