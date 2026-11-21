"""Export VAA reference and simulated catalogue to UTF-8-sig CSVs, no DB access."""
import csv
from pathlib import Path
from vaa_catalog import DEPARTMENTS, PROGRAMS, SOURCES, all_courses

OUT = Path(__file__).resolve().parent / 'catalog_preview'
OUT.mkdir(parents=True, exist_ok=True)

def write(name, rows):
    with (OUT / name).open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

write('departments.csv', [dict(department_key=k, department_code=f'FAC{k:02d}', department_name=n, source_url=SOURCES[src], source_status='verified_name') for k,n,src in DEPARTMENTS])
write('programs.csv', [dict(program_key=k,program_code=f'PRG{k:03d}',program_name=n,department_key=d,source_url=SOURCES['programs'],source_status='verified_name',department_assignment='demo_only') for k,n,d in PROGRAMS])
write('courses.csv', all_courses())
print('Exported three review CSVs to:', OUT)
