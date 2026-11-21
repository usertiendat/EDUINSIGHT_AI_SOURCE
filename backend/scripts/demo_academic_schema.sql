-- Isolated read-only-for-users academic demo records; existing warehouse facts untouched.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.demo_academic_enrollments (
  account_id bigint NOT NULL REFERENCES auth.demo_accounts(account_id) ON DELETE CASCADE,
  class_key integer NOT NULL REFERENCES warehouse.dim_class(class_key),
  PRIMARY KEY (account_id, class_key)
);
CREATE TABLE IF NOT EXISTS auth.demo_academic_grades (
  account_id bigint NOT NULL,
  class_key integer NOT NULL,
  assessment_type varchar(12) NOT NULL CHECK (assessment_type IN ('exam','quiz')),
  score numeric(5,2) NOT NULL CHECK (score >= 0 AND score <= 10),
  PRIMARY KEY (account_id, class_key, assessment_type),
  FOREIGN KEY (account_id, class_key) REFERENCES auth.demo_academic_enrollments(account_id, class_key) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS auth.demo_academic_attendance (
  account_id bigint NOT NULL,
  class_key integer NOT NULL,
  lesson_no integer NOT NULL CHECK (lesson_no BETWEEN 1 AND 30),
  attendance_status varchar(10) NOT NULL CHECK (attendance_status IN ('present','absent','late')),
  PRIMARY KEY (account_id, class_key, lesson_no),
  FOREIGN KEY (account_id, class_key) REFERENCES auth.demo_academic_enrollments(account_id, class_key) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS auth.demo_academic_assignments (
  account_id bigint NOT NULL,
  class_key integer NOT NULL,
  assignment_no integer NOT NULL CHECK (assignment_no BETWEEN 1 AND 20),
  submission_status varchar(12) NOT NULL CHECK (submission_status IN ('submitted','late','missing')),
  score numeric(5,2) CHECK (score IS NULL OR (score >= 0 AND score <= 10)),
  PRIMARY KEY (account_id, class_key, assignment_no),
  FOREIGN KEY (account_id, class_key) REFERENCES auth.demo_academic_enrollments(account_id, class_key) ON DELETE CASCADE,
  CHECK (submission_status <> 'missing' OR score IS NULL)
);
