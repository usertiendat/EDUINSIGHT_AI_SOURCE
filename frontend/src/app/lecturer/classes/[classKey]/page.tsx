"use client";
import { useParams } from "next/navigation";
import LecturerPortal from "../../../../components/lecturer/lecturer-portal";
export default function LecturerClassPage(){
  const params=useParams<{classKey:string}>();
  return <LecturerPortal selectedClassKey={params.classKey}/>;
}
