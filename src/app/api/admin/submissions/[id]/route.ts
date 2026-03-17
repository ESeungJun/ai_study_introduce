import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const userDoc = await getAdminDb().collection("users").doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== "admin") return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const { status } = await req.json();

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "잘못된 상태값입니다." }, { status: 400 });
  }

  try {
    await getAdminDb().collection("submissions").doc(id).update({
      status,
      approvedAt: status === "approved" ? FieldValue.serverTimestamp() : null,
      approvedBy: admin.uid,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("admin PATCH error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const db = getAdminDb();
    const doc = await db.collection("submissions").doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "존재하지 않는 게시글입니다." }, { status: 404 });
    }

    const data = doc.data()!;

    // Storage 파일 삭제 (실패해도 Firestore 삭제는 진행)
    try {
      const bucket = getStorage().bucket(`${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`);
      const filesToDelete = [
        data.pdfUrl,
        ...(data.screenshots || []),
        data.videoUrl,
      ].filter(Boolean);

      await Promise.allSettled(
        filesToDelete.map(async (url: string) => {
          const path = decodeURIComponent(url.split("/o/")[1]?.split("?")[0] || "");
          if (path) await bucket.file(path).delete();
        })
      );
    } catch (e) {
      console.warn("Storage 파일 삭제 실패 (무시):", e);
    }

    // Firestore 문서 삭제
    await db.collection("submissions").doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("admin DELETE error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
