EduInsight AI - Phase 4.2 Departments Management
================================================
Cac file cua goi duoc dat tuong doi voi thu muc FRONTEND (D:\EDUINSIGHT AI\frontend).
Goi khong sua PostgreSQL, migrations hoac FastAPI.

1. Sao luu file Sidebar truoc khi giai nen:
   Copy-Item "D:\EDUINSIGHT AI\frontend\src\components\layout\app-shell.tsx" "D:\app-shell-phase42-backup.tsx"

2. Tai ZIP vao D:\Download, sau do:
   Expand-Archive -LiteralPath "D:\Download\EduInsight_Phase4_2_Departments.zip" -DestinationPath "D:\EDUINSIGHT AI\frontend" -Force

3. Neu Next.js dang chay, dung bang Ctrl+C, khoi dong lai:
   cd "D:\EDUINSIGHT AI\frontend"
   npm run dev

4. Giu FastAPI dang chay o cong 8000. Kiem tra:
   http://127.0.0.1:8000/api/v1/analytics/departments
   http://127.0.0.1:8000/api/v1/analytics/courses
   http://localhost:3000/api/departments
   http://localhost:3000/departments
   http://localhost:3000/departments/FAC01

5. Sidebar se co muc "Khoa / Phan tich" dan toi /departments.

Luu y:
- Chi su dung du lieu gia lap, khong phat hanh cong khai khi chua co xac thuc.
- Ty le tong hop cua khoa la trung binh co trong so ban ghi cua tung hoc phan.
  Gia tri co the lech rat nho do API hoc phan da lam tron 2 chu so.
- Ban code duoc kiem tra tinh toan ven file; chua test next build trong moi truong Windows nguoi dung.
