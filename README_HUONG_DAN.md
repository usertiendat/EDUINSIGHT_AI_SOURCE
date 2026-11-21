# EduInsight AI — UI Phase 3 / Students Management (Demo)

Mục tiêu: trang `/students` và `/students/SV000001`, dùng **dữ liệu sinh viên GIẢ LẬP** từ PostgreSQL. Không thay đổi các bảng, migration, dữ liệu ETL hay 4 API Analytics trước đây.

## Tập tin trong gói

- `backend/app/services/student_service.py` — truy vấn chỉ đọc: danh sách, bộ lọc, hồ sơ, thống kê.
- `backend/app/api/v1/students.py` — API FastAPI có validate q/filter/pagination.
- `backend/app/main.py` — giữ `/`, `/health`, `/health/database`, Analytics router và thêm Students router.
- `frontend/src/app/page.tsx` — Dashboard Phase 2, **chỉ thêm mục Sinh viên vào sidebar**.
- `frontend/src/app/students/page.tsx` — trang danh sách, tìm kiếm, lọc, phân trang.
- `frontend/src/app/students/students.module.css` — CSS riêng, không sửa globals.css.
- `frontend/src/app/students/[studentCode]/page.tsx` — hồ sơ sinh viên, lượt đăng ký, điểm, chuyên cần, nộp bài.
- `frontend/src/app/api/students/route.ts` — proxy danh sách và bộ lọc.
- `frontend/src/app/api/students/[studentCode]/route.ts` — proxy hồ sơ sinh viên.

## Cài đặt an toàn (Windows PowerShell)

Các lệnh dưới đây dành cho bản ZIP tên `eduinsight_students_phase3.zip` nằm trong Downloads.

### 1. Sao lưu

```powershell
cd "D:\EDUINSIGHT AI"
New-Item -ItemType Directory -Force -Path ".\backups\phase3-before" | Out-Null
Copy-Item ".\backend\app\main.py" ".\backups\phase3-before\main.py"
Copy-Item ".\frontend\src\app\page.tsx" ".\backups\phase3-before\page.tsx"
```

### 2. Giải nén vào thư mục ROOT của dự án (KHÔNG phải thư mục frontend)

```powershell
Expand-Archive -Path "$env:USERPROFILE\Downloads\eduinsight_students_phase3.zip" -DestinationPath "D:\EDUINSIGHT AI" -Force
```

### 3. Kiểm tra file + Python

```powershell
Test-Path .\backend\app\api\v1\students.py
Test-Path .\frontend\src\app\students\page.tsx
Test-Path '.\frontend\src\app\students\[studentCode]\page.tsx'
.\backend\.venv\Scripts\python.exe -m py_compile .\backend\app\main.py .\backend\app\api\v1\students.py .\backend\app\services\student_service.py
```

### 4. Chạy backend và frontend ở HAI terminal khác nhau

Backend (terminal 1, giữ đang chạy):

```powershell
cd "D:\EDUINSIGHT AI"
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --app-dir backend --host 127.0.0.1 --port 8000
```

Frontend (terminal 2, giữ đang chạy):

```powershell
cd "D:\EDUINSIGHT AI\frontend"
npm run dev
```

Nếu đã có server tự reload chạy sẵn thì không chạy thêm một bản nữa.

### 5. Kiểm thử API

- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/api/v1/students?page=1&page_size=12
- http://127.0.0.1:8000/api/v1/students/filters
- http://127.0.0.1:8000/api/v1/students/SV000001
- http://localhost:3000/students
- http://localhost:3000/students/SV000001

Để kiểm tra từ PowerShell:

```powershell
(Invoke-RestMethod 'http://127.0.0.1:8000/api/v1/students?page=1&page_size=12').data.total
```

Kết quả dự kiến là `1000` (khi toàn bộ sinh viên đều is_current). Nếu lỗi, xem log FastAPI.

## Giới hạn & Bảo mật

- Chỉ dành cho **localhost / phát triển bằng dữ liệu giả lập**. Chưa có login/RBAC, vì vậy KHÔNG public /api/v1/students và /students trên Internet hoặc dùng dữ liệu sinh viên thật.
- Trang chỉ đọc, không có API sửa/xóa sinh viên.
- Truy vấn tham số hóa, q giới hạn 100 ký tự, page_size tối đa 100.
- `/students/{studentCode}` trả về điểm trung bình **các bản ghi điểm** theo lớp, không phải điểm tổng kết môn/GPA.
- SQL đảm bảo các fact được tổng hợp riêng, tránh đếm trùng do join nhiều fact.
- Cần bổ sung RBAC, kiểm tra quyền dữ liệu, audit log, xóa/mã hóa dữ liệu cá nhân, test bảo mật trước khi deploy.
- Nếu backend đã có chỉnh sửa riêng trong `main.py` ngoài bản Phase 2, đừng ghi đè mà hãy thêm hai dòng `import students_router` và `app.include_router` thủ công.

## Khôi phục bản cũ nếu cần

```powershell
cd "D:\EDUINSIGHT AI"
Copy-Item ".\backups\phase3-before\main.py" ".\backend\app\main.py" -Force
Copy-Item ".\backups\phase3-before\page.tsx" ".\frontend\src\app\page.tsx" -Force
```

Các file mới nằm ở `/students`, có thể giữ lại và đơn giản không truy cập nếu khôi phục.
