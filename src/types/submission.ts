import { Timestamp } from "firebase/firestore";

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface Submission {
  id: string;
  authorName: string;
  authorContact?: string;
  title: string;
  description?: string;
  pdfUrl: string;
  screenshots: string[];
  videoUrl?: string;
  status: SubmissionStatus;
  createdAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
}

export type CreateSubmissionInput = Omit<
  Submission,
  "id" | "status" | "createdAt" | "approvedAt" | "approvedBy"
>;
