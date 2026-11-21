
import { Suspense } from "react";
import CourseDetailClient from "./CourseDetailClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Đang tải thông tin học phần...</div>}>
      <CourseDetailClient />
    </Suspense>
  );
}
