import { Suspense, type ReactNode } from "react";
export default function LecturerClassLayout({children}:{children:ReactNode}){
  return <Suspense fallback={<main style={{padding:40}}>Đang tải thông tin lớp học phần...</main>}>{children}</Suspense>;
}
