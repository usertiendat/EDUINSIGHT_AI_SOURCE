
import { Suspense } from "react";
import DepartmentDetailClient from "./DepartmentDetailClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Đang tải thông tin khoa...</div>}>
      <DepartmentDetailClient />
    </Suspense>
  );
}
