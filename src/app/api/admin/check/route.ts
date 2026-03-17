import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "토큰 없음" }, { status: 401 });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const userDoc = await getAdminDb().collection("users").doc(uid).get();
    const data = userDoc.data();

    return NextResponse.json({
      uid,
      exists: userDoc.exists,
      role: data?.role ?? null,
      isAdmin: userDoc.exists && data?.role === "admin",
    });
  } catch (e) {
    console.error("admin check error:", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
