# Architecture: LMS Module Structure

## Module Overview

The LMS module is a first-class citizen in Super CRM — not a bolt-on. It integrates directly with CRM (course completion signals update lead scores) and HRMS (employee training tracking).

## Data Models

```typescript
// Course
interface Course {
  _id: ObjectId;
  tenantId: string;
  title: string;
  description: string;
  instructorId: string;
  category: string;
  thumbnail: string;       // S3 URL
  status: 'draft' | 'published' | 'archived';
  modules: CourseModule[];
  certificateTemplate?: string;
  price?: number;          // 0 = free internal course
  createdAt: Date;
  updatedAt: Date;
}

// Course Module (Chapter)
interface CourseModule {
  _id: ObjectId;
  title: string;
  order: number;
  lessons: Lesson[];
}

// Lesson
interface Lesson {
  _id: ObjectId;
  title: string;
  type: 'video' | 'document' | 'quiz' | 'text';
  contentUrl?: string;     // S3 video/doc URL
  duration?: number;       // seconds
  quiz?: Quiz;
  order: number;
}

// Enrollment
interface Enrollment {
  _id: ObjectId;
  tenantId: string;
  courseId: ObjectId;
  userId: string;
  enrolledAt: Date;
  completedAt?: Date;
  progress: number;        // 0–100
  lessonsCompleted: ObjectId[];
  certificateId?: string;
  quizAttempts: QuizAttempt[];
}

// Quiz
interface Quiz {
  questions: QuizQuestion[];
  passingScore: number;    // percentage
  maxAttempts: number;
}

interface QuizQuestion {
  _id: ObjectId;
  text: string;
  type: 'mcq' | 'true_false';
  options: string[];
  correctIndex: number;
  points: number;
}
```

## API Endpoints

```
POST   /api/v1/lms/courses                    # Create course (Instructor+)
GET    /api/v1/lms/courses                    # List courses (tenant scoped)
GET    /api/v1/lms/courses/:courseId          # Course detail
PUT    /api/v1/lms/courses/:courseId          # Update course
DELETE /api/v1/lms/courses/:courseId          # Archive course

POST   /api/v1/lms/courses/:courseId/enroll   # Enroll user
GET    /api/v1/lms/enrollments/me             # My enrollments
PUT    /api/v1/lms/enrollments/:id/progress   # Update lesson progress

POST   /api/v1/lms/lessons/:id/quiz/attempt   # Submit quiz
GET    /api/v1/lms/certificates/:certId        # View certificate
POST   /api/v1/lms/media/upload               # Presigned S3 URL
```

## CRM Integration Bridge

```typescript
// When a course is completed, emit an event
async function onCourseCompleted(enrollment: Enrollment) {
  await eventBus.emit('lms.course.completed', {
    userId: enrollment.userId,
    courseId: enrollment.courseId,
    tenantId: enrollment.tenantId,
    completedAt: new Date(),
  });
}

// CRM listener: find associated lead and boost score
eventBus.on('lms.course.completed', async (data) => {
  const lead = await LeadRepository.findByUserId(data.userId, data.tenantId);
  if (lead) {
    await scoringQueue.add('score-update', {
      leadId: lead._id,
      tenantId: data.tenantId,
      trigger: 'course_completed',
      bonusPoints: 10,
    });
  }
});
```

## Certificate Generation

```typescript
// Uses PDF-lib or Puppeteer to render certificate
async function generateCertificate(enrollment: Enrollment, course: Course, user: User): Promise<string> {
  const pdfBuffer = await renderCertificatePDF({
    studentName: user.name,
    courseName: course.title,
    completionDate: enrollment.completedAt,
    certificateId: generateCertId(),
    instructorName: course.instructorName,
  });

  const s3Key = `certificates/${enrollment.tenantId}/${enrollment._id}.pdf`;
  await s3.upload(s3Key, pdfBuffer);
  return s3.getSignedUrl(s3Key);
}
```

## Progress Calculation

```typescript
function calculateProgress(enrollment: Enrollment, course: Course): number {
  const totalLessons = course.modules.flatMap(m => m.lessons).length;
  if (totalLessons === 0) return 0;
  return Math.round((enrollment.lessonsCompleted.length / totalLessons) * 100);
}
```


## Updated: 2026-02-26 (Thu)

**Quiz retry logic:** Added configurable max-attempts per quiz at the course level (default: 3). Attempts beyond max trigger a 24h cooldown per student. Logic handled in enrollment service, not the quiz model.
