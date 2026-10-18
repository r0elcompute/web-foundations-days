# School Database Design

## Tables

- **students** stores each student's ID, name, and email. The ID is the primary key, and email is required and unique so two students cannot share an email address.
- **courses** stores each course's ID and name. The ID is the primary key, and the required course name is unique.
- **enrolments** records which student takes which course and the student's grade. Its ID is the primary key; `student_id` and `course_id` are required foreign keys to the other tables. A unique constraint on the pair prevents the same student from enrolling in the same course twice.

## Relationships

One student can have many enrolments, and one course can have many enrolments; each enrolment belongs to one student and one course. Together, students and courses form a many-to-many relationship: a student can take multiple courses, and a course can have multiple students. The enrolments join table represents that relationship and stores data specific to each pairing, such as the grade.

## Index

I would add an index on `enrolments(course_id)` to speed up lookups of students on a course and per-course student counts. The unique constraint on `(student_id, course_id)` already creates an index useful for lookups beginning with `student_id`.

## SQL or NoSQL?

I would choose a relational SQL database for this system. Students, courses, and enrolments have clear relationships, and foreign keys and uniqueness constraints protect the data from invalid references and duplicate enrolments. SQL joins make it straightforward to query course rosters, student schedules, and counts. A NoSQL database could work, but it would require extra care to maintain these relationships and constraints.
