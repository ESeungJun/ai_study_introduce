import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebase-admin";
import SubmissionDetail from "@/components/submission/SubmissionDetail";

async function getSubmission(id: string) {
  try {
    const doc = await getAdminDb().collection("submissions").doc(id).get();
    if (!doc.exists || doc.data()?.status !== "approved") return null;

    const data = doc.data()!;
    return {
      id: doc.id,
      authorName: data.authorName,
      authorContact: data.authorContact,
      title: data.title,
      description: data.description,
      pdfUrl: data.pdfUrl,
      screenshots: data.screenshots || [],
      videoUrl: data.videoUrl,
      createdAt: data.approvedAt?.toDate().toISOString() || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const submission = await getSubmission(id);

  if (!submission) notFound();

  return <SubmissionDetail submission={submission} />;
}
