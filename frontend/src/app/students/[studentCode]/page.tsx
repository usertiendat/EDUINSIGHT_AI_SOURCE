
import { Suspense } from "react";
import StudentDetailClient from "./StudentDetailClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Đang tải thông tin sinh viên...</div>}>
      <StudentDetailClient />
    </Suspense>
  );
}
