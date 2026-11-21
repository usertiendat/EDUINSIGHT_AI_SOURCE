"""Reference-backed VAA demo catalogue. Keys are demo-only, not official IDs.

Only entries with source_status='verified_name' claim that the name appears
in a VAA publication. Curriculum ownership for programs is an illustrative
mapping unless independently sourced. The remaining course names are labelled
simulation, not official VA(A) curriculum records.
"""

ACADEMY_NAME = 'Học viện Hàng không Việt Nam'
ACADEMY_SHORT = 'VAA'

SOURCES = {
    'organization': 'https://vaa.edu.vn/chi-tiet-dang-bo/gioi-thieu-dang-bo-hoc-vien-hang-khong-viet-nam/',
    'academy_2026': 'https://vaa.edu.vn/hoc-vien-hang-khong-viet-nam-tung-bung-khai-giang-nam-hoc-moi-huong-toi-nguon-nhan-luc-cho-hang-khong-tuong-lai/',
    'programs': 'https://vaa.edu.vn/wp-content/uploads/2024/08/PTXT-HHK-20241.pdf',
    'course_examples': 'https://media.vaa.edu.vn/Media/2_SVVAA/FolderFunc/202403/Documents/danh-sach-cac-lhp-mo-trong-hoc-ky-iii-nam-hoc-2023-2024-20240309082943-e.pdf',
    'course_examples_2': 'https://media.vaa.edu.vn/Media/SVVAA/FolderFunc/202205/Documents/5892022qdve-viec-bo-sung-hoc-phan-tu-chon-trong-cac-chuong-trinh-dao-tao-dai-hoc-cao-dang2321cc5b-d-e.pdf',
    'tourism': 'https://ftas.vaa.edu.vn/lich-su-hinh-thanh-va-phat-trien',
    'business': 'https://fba.vaa.edu.vn/gioi-thieu-chung',
    'economics': 'https://www.ate.vaa.edu.vn/gi%E1%BB%9Bi-thi%E1%BB%87u/gi%E1%BB%9Bi-thi%E1%BB%87u-chung',
}

# key, name, source. Keys FAC01 ... FAC08 are INTERNAL DEMO identifiers.
DEPARTMENTS = [
    (1, 'Khoa Công nghệ thông tin', 'organization'),
    (2, 'Khoa Kinh tế Hàng không', 'economics'),
    (3, 'Khoa Khai thác Hàng không', 'organization'),
    (4, 'Khoa Kỹ thuật Hàng không', 'organization'),
    (5, 'Khoa Quản trị kinh doanh', 'business'),
    (6, 'Khoa Du lịch và Dịch vụ Hàng không', 'tourism'),
    (7, 'Khoa Điện – Điện tử', 'organization'),
    (8, 'Khoa Xây dựng', 'organization'),
]

# 12 selected REAL program names; not a complete list of VAA's 18 majors.
# Department relationships below are a DEMO model, not asserted official assignments.
PROGRAMS = [
    (1, 'Công nghệ thông tin', 1),
    (2, 'Quản lý hoạt động bay', 3),
    (3, 'Kỹ thuật hàng không', 4),
    (4, 'Quản trị kinh doanh', 5),
    (5, 'Kinh tế vận tải', 2),
    (6, 'Kinh doanh quốc tế', 2),
    (7, 'Quản trị dịch vụ du lịch và lữ hành', 6),
    (8, 'Quản trị nhân lực', 5),
    (9, 'Công nghệ kỹ thuật điện tử – viễn thông', 7),
    (10, 'Công nghệ kỹ thuật điều khiển và tự động hóa', 7),
    (11, 'Công nghệ kỹ thuật công trình xây dựng', 8),
    (12, 'Ngôn ngữ Anh', 6),
]

# 14 course names found in VAA publications. Credits are provided only when
# explicitly available from the referenced schedule; other credits retain demo
# amounts. Department assignments for 'course_examples_2' are ILLUSTRATIVE.
VERIFIED_COURSES = [
    # key, name, department, credits | None means keep demo credits, source, ownership_verified
    (1, 'An toàn hàng không', 2, 2, 'course_examples', True),
    (2, 'An toàn và bảo mật thông tin', 1, 3, 'course_examples', True),
    (3, 'Aviation Law', 5, 2, 'course_examples', True),
    (4, 'Bản đồ hàng không', 3, 2, 'course_examples', True),
    (5, 'Bảo hiểm vận tải', 2, 2, 'course_examples', True),
    (6, 'Các hệ thống trên tàu bay 1', 4, 4, 'course_examples', True),
    (7, 'Các hoạt động khai thác tại Cảng HK', 2, 3, 'course_examples', True),
    (8, 'Cấu trúc dữ liệu và thuật giải', 1, 3, 'course_examples', True),
    (9, 'Quản trị học', 5, None, 'course_examples_2', False),
    (10, 'Pháp luật Hàng không', 5, None, 'course_examples_2', False),
    (11, 'Điện – điện tử tàu bay', 4, None, 'course_examples_2', False),
    (12, 'Động cơ turbine khí 1', 4, None, 'course_examples_2', False),
    (13, 'Động cơ turbine khí 2', 4, None, 'course_examples_2', False),
    (14, 'Quản trị thiết bị cảng hàng không', 2, None, 'course_examples_2', False),
]

SIMULATED_THEMES = {
    1: ['Phân tích dữ liệu ứng dụng', 'Hệ thống thông tin doanh nghiệp', 'Kỹ thuật phần mềm', 'Cơ sở dữ liệu'],
    2: ['Kinh tế vận tải', 'Quản lý logistics', 'Kinh doanh hàng không', 'Phân tích thị trường'],
    3: ['Quản lý hoạt động bay', 'Khai thác sân bay', 'Lập kế hoạch bay', 'Thông tin hàng không'],
    4: ['Vật liệu kỹ thuật', 'Bảo dưỡng tàu bay', 'Khí động học', 'Kết cấu hàng không'],
    5: ['Quản trị doanh nghiệp', 'Phân tích kinh doanh', 'Quản lý vận hành', 'Lập kế hoạch chiến lược'],
    6: ['Quản trị dịch vụ', 'Du lịch hàng không', 'Chăm sóc khách hàng', 'Tổ chức sự kiện'],
    7: ['Điện tử số', 'Điều khiển tự động', 'Hệ thống truyền thông', 'Vi điều khiển'],
    8: ['Kết cấu công trình', 'Quản lý dự án xây dựng', 'Hạ tầng giao thông', 'Vật liệu xây dựng'],
}


def all_courses():
    records = []
    for key, name, dept, credits, source, owner_verified in VERIFIED_COURSES:
        records.append({
            'course_key': key, 'course_code': f'CRS{key:03d}',
            'course_name': name, 'department_key': dept,
            'credits': credits, 'source_status': 'verified_name',
            'source_url': SOURCES[source],
            'department_assignment': 'documented_2024' if owner_verified else 'demo_only',
            'course_code_status': 'demo_only',
            'credit_status': 'documented_2024' if credits is not None else 'keep_demo',
        })
    for key in range(15, 61):
        dept = (key - 15) % 8 + 1
        themes = SIMULATED_THEMES[dept]
        title = themes[(key - 15) // 8 % len(themes)]
        records.append({
            'course_key': key, 'course_code': f'CRS{key:03d}',
            'course_name': f'Mô phỏng: {title} ({key:03d})',
            'department_key': dept, 'credits': None,
            'source_status': 'simulated', 'source_url': '',
            'department_assignment': 'demo_only',
            'course_code_status': 'demo_only', 'credit_status': 'keep_demo',
        })
    return records
