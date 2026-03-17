import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, cohort, authorName, authorContact, title, description, pdfUrl, screenshots, videoUrl } = body;

    if (password !== process.env.UPLOAD_PASSWORD) {
      return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    if (!authorName?.trim() || !title?.trim() || !pdfUrl || !cohort?.trim()) {
      return NextResponse.json({ error: "필수 항목을 입력해주세요." }, { status: 400 });
    }

    const submission = {
      cohort: cohort.trim(),
      authorName: authorName.trim(),
      authorContact: authorContact?.trim() || null,
      title: title.trim(),
      description: description?.trim() || null,
      pdfUrl,
      screenshots: screenshots || [],
      videoUrl: videoUrl?.trim() || null,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await getAdminDb().collection("submissions").add(submission);

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("submission POST error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
