PRAGMA foreign_keys = ON;

CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL UNIQUE
);

CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students (student_id),
    FOREIGN KEY (course_id) REFERENCES courses (course_id),
    UNIQUE (student_id, course_id)
);

INSERT INTO students (student_id, full_name, email) VALUES
    (1, 'Amina Yusuf', 'amina.yusuf@example.com'),
    (2, 'Daniel Kim', 'daniel.kim@example.com'),
    (3, 'Priya Shah', 'priya.shah@example.com'),
    (4, 'Marcus Reed', 'marcus.reed@example.com');

INSERT INTO courses (course_id, course_name) VALUES
    (1, 'Database Fundamentals'),
    (2, 'Web Development'),
    (3, 'Data Structures');

INSERT INTO enrolments (enrolment_id, student_id, course_id, grade) VALUES
    (1, 1, 1, 'A'),
    (2, 1, 2, 'B+'),
    (3, 2, 1, 'B'),
    (4, 2, 3, 'A-'),
    (5, 3, 2, 'A');

-- 1. All courses taken by one student, looked up by name.
SELECT c.course_name
FROM students AS s
JOIN enrolments AS e ON e.student_id = s.student_id
JOIN courses AS c ON c.course_id = e.course_id
WHERE s.full_name = 'Amina Yusuf'
ORDER BY c.course_name;

-- 2. All students enrolled on one course.
SELECT s.full_name
FROM courses AS c
JOIN enrolments AS e ON e.course_id = c.course_id
JOIN students AS s ON s.student_id = e.student_id
WHERE c.course_name = 'Database Fundamentals'
ORDER BY s.full_name;

-- 3. Student count per course, including courses with no enrolments.
SELECT c.course_name, COUNT(e.student_id) AS student_count
FROM courses AS c
LEFT JOIN enrolments AS e ON e.course_id = c.course_id
GROUP BY c.course_id, c.course_name
ORDER BY c.course_name;

-- 4. Students who have no enrolments.
SELECT s.full_name
FROM students AS s
LEFT JOIN enrolments AS e ON e.student_id = s.student_id
WHERE e.student_id IS NULL
ORDER BY s.full_name;

-- 5. Update one student's grade on one course.
UPDATE enrolments
SET grade = 'A'
WHERE student_id = 1 AND course_id = 2;
