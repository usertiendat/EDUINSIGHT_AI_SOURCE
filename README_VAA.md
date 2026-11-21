# EduInsight AI — VAA Reference Demo Data (bản 1)

## Mục đích

Cập nhật **tên** trong Data Warehouse EduInsight AI để gần với **Học viện Hàng không Việt Nam (VAA)**. Không xây dựng dữ liệu điểm/sinh viên có thật.

- 8 tên khoa được dẫn nguồn từ các trang VAA (không khẳng định đây là toàn bộ cơ cấu hiện hành).
- 12 tên ngành có trong tài liệu tuyển sinh đã công bố, được chọn để khớp 12 dòng demo sẵn có. Quan hệ ngành–khoa ở bản này chỉ là **phân bổ mô phỏng**.
- 14 học phần có tên xuất hiện trong tài liệu VAA; học phần còn lại ghi rõ **Mô phỏng:**, không được xem là chương trình đào tạo chính thức.
- Mã FAC01, PRG001, CRS001, SV000001... là **mã nội bộ trong bộ demo**, KHÔNG phải mã VAA. Một số tín chỉ giữ nguyên mức giả lập; metadata `credit_status` ghi rõ.
- 1.000 sinh viên và 40 giảng viên sử dụng tên **mô phỏng**, không phải người thật; tất cả điểm, điểm danh, nộp bài, khảo sát vẫn là giả lập.
- 14 bảng được bảo toàn; thêm 3 dòng `dim_department` (tổng 8). Mọi `student_key`, `course_key`, `class_key` và 5 bảng Fact được giữ nguyên.

## Nguồn đối chiếu

Danh sách link đầy đủ nằm trong `data_pipeline/vaa/vaa_catalog.py` và các CSV `catalog_preview`.

- Trang chủ VAA / các đơn vị: https://vaa.edu.vn/chi-tiet-dang-bo/gioi-thieu-dang-bo-hoc-vien-hang-khong-viet-nam/
- Thông tin tuyển sinh 2024: https://vaa.edu.vn/wp-content/uploads/2024/08/PTXT-HHK-20241.pdf
- Danh sách lớp học phần học kỳ III 2023–2024: https://media.vaa.edu.vn/Media/2_SVVAA/FolderFunc/202403/Documents/danh-sach-cac-lhp-mo-trong-hoc-ky-iii-nam-hoc-2023-2024-20240309082943-e.pdf
- Quyết định bổ sung học phần: https://media.vaa.edu.vn/Media/SVVAA/FolderFunc/202205/Documents/5892022qdve-viec-bo-sung-hoc-phan-tu-chon-trong-cac-chuong-trinh-dao-tao-dai-hoc-cao-dang2321cc5b-d-e.pdf

## 1. Cài vào dự án

Từ PowerShell ở `D:\EDUINSIGHT AI`, giải nén ZIP vào **thư mục gốc dự án** (không phải riêng frontend). Ví dụ nếu ZIP ở `D:\Download`:

```powershell
cd "D:\EDUINSIGHT AI"
Expand-Archive -LiteralPath "D:\Download\EduInsight_VAA_Demo_Data_v1.zip" -DestinationPath "." -Force
```

## 2. Xem danh mục không cần truy cập DB

```powershell
python .\data_pipeline\vaa\export_vaa_catalog.py
```

Mở 3 CSV trong `data_pipeline/vaa/catalog_preview/` để kiểm tra nguồn và dữ liệu mô phỏng.

## 3. Xem trước trạng thái DB — KHÔNG sửa dữ liệu

Yêu cầu PostgreSQL Docker đang chạy, Python venv đã có SQLAlchemy và psycopg.

```powershell
.\backend\.venv\Scripts\python.exe .\data_pipeline\vaa\update_vaa_demo.py --preview
```

Chỉ tiếp tục nếu dòng cuối là `PREVIEW ONLY` và database đúng là bộ demo. Script chủ động từ chối nếu số lượng bảng, khóa hoặc tên sinh viên không đúng mẫu.

## 4. SAO LƯU PostgreSQL trước khi áp dụng (bắt buộc)

Tránh ghi nhị phân qua dấu `>` của PowerShell cũ. Hãy lưu dump trong container rồi **docker cp** ra ổ D.

```powershell
New-Item -ItemType Directory -Force -Path "D:\Backups" | Out-Null
docker compose --env-file .env exec -T postgres pg_dump -U eduinsight_app -d eduinsight -Fc -f /tmp/eduinsight_before_vaa.dump
docker cp "eduinsight-postgres:/tmp/eduinsight_before_vaa.dump" "D:\Backups\eduinsight_before_vaa.dump"
Get-Item "D:\Backups\eduinsight_before_vaa.dump" | Select-Object FullName,Length
```

Phải có file **không rỗng** và kiểm tra danh mục của dump bên trong container:

```powershell
docker compose --env-file .env exec -T postgres pg_restore -l /tmp/eduinsight_before_vaa.dump
```

**Không gửi file dump hoặc `.env` lên chat.** Dump có thể chứa dữ liệu cá nhân nếu DB đã thay đổi ngoài phạm vi demo.

## 5. Cập nhật dữ liệu sau khi xác nhận backup

```powershell
.\backend\.venv\Scripts\python.exe .\data_pipeline\vaa\update_vaa_demo.py --apply --backup-file "D:\Backups\eduinsight_before_vaa.dump"
```

Mọi thay đổi chạy trong **một transaction**. Có kiểm tra số lượng rows và quan hệ khoa–giảng viên–lớp ngay trước commit; lỗi thì rollback. Không chạy lại ETL `load_warehouse.py --apply` trên DB đã có dữ liệu.

## 6. Kiểm tra DB và giao diện

```powershell
docker compose --env-file .env exec postgres psql -U eduinsight_app -d eduinsight -c "SELECT department_code, department_name FROM warehouse.dim_department ORDER BY department_key;"
docker compose --env-file .env exec postgres psql -U eduinsight_app -d eduinsight -c "SELECT (SELECT COUNT(*) FROM warehouse.dim_student) AS students, (SELECT COUNT(*) FROM warehouse.fact_grades) AS grades, (SELECT COUNT(*) FROM warehouse.fact_attendance) AS attendance;"
```

Expected: **8 khoa**, **1000 sinh viên**, **5000 điểm**, **15000 chuyên cần**. Reload Next.js `/departments`, `/courses`, `/students`, dashboard. FastAPI queries re-read DB; restart `uvicorn` if needed.

## Giới hạn / triển khai giai đoạn sau

Bộ này là bản **chuyển tên dữ liệu thử nghiệm trên DB hiện có**, không phải bản sao hoàn chỉnh chương trình đào tạo năm 2026. Để có đủ 18 ngành / 44 chuyên ngành, phải tạo kế hoạch mở rộng model, mapping nguồn, lịch đào tạo có độ tin cậy và kiểm thử mới. Không sử dụng số liệu thống kê giả lập để nhận định kết quả thật của trường.

**Quan trọng:** Không đặt đè `generate_dimensions.py` cũ hay chạy lại chương trình sinh dữ liệu cũ sau khi cập nhật, vì dữ liệu CSV cũ sẽ không khớp tên tham chiếu. Trong bản này, catalogue là nguồn cho các lần nâng cấp tiếp theo; pipeline CSV v2 sẽ thực hiện riêng sau khi xác minh học phần/ngành.
