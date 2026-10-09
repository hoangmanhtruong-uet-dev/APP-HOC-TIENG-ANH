# MASTER PLAN: IELTS & ENGLISH EDTECH PLATFORM

**Phiên bản:** `3.0.0-MASTERPLAN`  
**Trạng thái:** Product + Technical Master Plan  
**Ngày cập nhật:** 2026-09-30  
**Mục tiêu:** Project cá nhân, triển khai như một sản phẩm thật, ưu tiên người dùng thật trước khi mở rộng thành platform quy mô lớn.

> **Nguồn baseline:** Tài liệu `2.0.0-PROD` ngày 2026-09-30. Master Plan này giữ lại các quyết định kỹ thuật, security, AI, database và production-readiness đã có; đồng thời bổ sung Product Strategy, MVP scope, UX flow, KPI, Content Strategy, Cost Model, Beta Loop, Operations và Definition of Done.

---

# 1. PRODUCT VISION

## 1.1. Product statement

Nền tảng học IELTS/English cá nhân hóa giúp người học biết **mình đang ở đâu → hôm nay cần học gì → mình sai ở đâu → cần ôn lại gì → đang tiến bộ như thế nào**.

Sản phẩm không được xem là một collection của các feature luyện IELTS độc lập. Core product là một **learning loop có dữ liệu**:

```text
Onboarding
   ↓
Diagnostic
   ↓
Current Level / Weakness Profile
   ↓
Adaptive Study Plan
   ↓
Practice
   ↓
Result + Error Analysis
   ↓
Vocabulary / Error Notebook
   ↓
Spaced Repetition
   ↓
Progress Analytics
   ↓
Rescheduled Study Plan
   ↓
Quay lại học
```

## 1.2. North Star

**North Star Metric:** số người dùng thực sự hoàn thành các phiên học có giá trị mỗi tuần và quay lại tiếp tục học.

North Star không phải số feature, số API, số test hay số request hệ thống xử lý được.

## 1.3. Product principles

1. **Learning outcome first:** mọi feature phải cải thiện một bước rõ ràng trong learning loop.
2. **MVP trước, platform sau:** chưa xây infrastructure phức tạp chỉ vì có thể cần nó trong tương lai.
3. **Real users as source of truth:** feedback và dữ liệu sử dụng của beta users được dùng để quyết định ưu tiên.
4. **Server-authoritative assessment:** các trạng thái, đáp án, điểm số và thời gian thi quan trọng phải được bảo vệ phía server.
5. **Explainable feedback:** kết quả AI phải chỉ ra bằng chứng, lỗi, nguyên nhân và hành động tiếp theo; không chỉ trả một con số band.
6. **Content quality matters:** chất lượng question bank, answer key và explanation là một phần của product core.
7. **Measured iteration:** mọi phase phải có acceptance criteria và product metrics trước khi được coi là hoàn thành.

## 1.4. Product goals

### Giai đoạn đầu

- Cho phép một người dùng mới đăng ký và hoàn thành onboarding.
- Đánh giá được điểm xuất phát bằng diagnostic test.
- Tạo kế hoạch học khả thi theo mục tiêu và thời gian thực tế.
- Cho phép luyện Reading và Listening có chấm điểm chính xác.
- Tự động ghi nhận lỗi và từ vựng cần ôn.
- Có SRS để đưa lỗi/từ vựng quay lại đúng thời điểm.
- Có dashboard đủ đơn giản để user biết việc cần làm hôm nay.

### Sau khi core loop ổn định

- Writing AI feedback.
- Speaking AI feedback.
- Mock test.
- Advanced analytics.
- Gamification/notification.
- Monetization.
- Scale infrastructure.

## 1.5. Non-goals của MVP

MVP **không bắt buộc** có ngay:

- Mobile native app.
- Microservices phân tán.
- Enterprise multi-tenant.
- Full proctoring.
- DRM cấp production cho mọi audio.
- Hệ thống thanh toán đa quốc gia.
- Zalo ZNS và mọi kênh notification cùng lúc.
- Load test ở quy mô hàng nghìn người dùng khi chưa có nhu cầu thực tế.

Các capability này được giữ trong Target Architecture nhưng triển khai theo nhu cầu thực tế.

---

# 2. TARGET USERS & USER NEEDS

## 2.1. Primary user

Persona mục tiêu ban đầu:

- Sinh viên hoặc người học tự học tiếng Anh.
- Trình độ ban đầu khoảng IELTS 3.5–5.5 hoặc chưa có band chắc chắn.
- Mục tiêu IELTS khoảng 6.0–7.0+.
- Học 15–60 phút/ngày ở giai đoạn MVP.
- Muốn biết chính xác yếu ở đâu và hôm nay nên học gì.

> Persona trên là **product assumption**, cần được kiểm chứng bằng beta users; không coi là dữ liệu thị trường đã được xác minh.

## 2.2. Core pain points cần kiểm chứng

1. Không biết nên học gì mỗi ngày.
2. Làm nhiều đề nhưng không biến lỗi sai thành kế hoạch ôn tập.
3. Từ vựng học xong nhanh quên.
4. Writing/Speaking thiếu feedback có cấu trúc.
5. Khó theo dõi tiến bộ thật theo kỹ năng.
6. Dễ bỏ học khi lịch học không còn phù hợp với thời gian thực tế.

## 2.3. Jobs-to-be-Done

> “Khi tôi có mục tiêu IELTS nhưng không biết phân bổ thời gian và ưu tiên gì, tôi muốn hệ thống biến mục tiêu thành những việc học nhỏ, cụ thể và có thể hoàn thành mỗi ngày.”

> “Khi tôi làm sai một câu hoặc viết/nói chưa tốt, tôi muốn biết tại sao sai và khi nào nên luyện lại để lỗi đó không lặp lại.”

---

# 3. USER JOURNEY

## 3.1. First-time user journey

```text
Landing Page
   ↓
Register / Login
   ↓
Onboarding
   ├── Current level / recent score
   ├── Target Overall Band
   ├── Target skill bands
   ├── Exam date (optional)
   └── Daily study time
   ↓
Diagnostic Test
   ↓
Initial Skill Profile
   ↓
Recommended Study Plan
   ↓
Dashboard: “Hôm nay học gì?”
   ↓
First Lesson
   ↓
Result
   ↓
Errors + Vocabulary
   ↓
Schedule next review
```

## 3.2. Returning user journey

```text
Login
  ↓
Today Dashboard
  ├── Due Reviews
  ├── Recommended Practice
  ├── Continue unfinished task
  └── Progress
  ↓
Practice
  ↓
Result
  ↓
Feedback / Error extraction
  ↓
Updated Plan
```

## 3.3. Writing journey

```text
Writing prompt
   ↓
Write
   ↓
Submit
   ↓
Pre-validation
   ↓
AI Queue
   ↓
AI Evaluation
   ↓
Band + Criterion Feedback
   ↓
Sentence-level Corrections
   ↓
Rewrite
   ↓
Compare original vs rewrite
```

## 3.4. Speaking journey

```text
Prepare mic
   ↓
Room noise calibration
   ↓
Part 1 → Part 2 → Part 3
   ↓
Audio upload
   ↓
Speech analysis
   ├── STT
   └── Pronunciation / fluency signals
   ↓
AI Evaluation
   ↓
Band + feedback + audio highlights
```

---

# 4. MVP DEFINITION

## 4.1. MVP objective

MVP phải chứng minh được một giả thuyết quan trọng:

> **Người học có quay lại sử dụng một hệ thống “practice → error analysis → review → plan” hay không?**

## 4.2. MVP scope — MUST

| Module         | MVP requirement                              | Priority |
| -------------- | -------------------------------------------- | -------- |
| Identity       | Email/Google auth, session, profile          | MUST     |
| Onboarding     | Target band, current level, study time       | MUST     |
| Diagnostic     | Bài test đầu vào rút gọn                     | MUST     |
| Study Plan     | Daily/weekly plan cơ bản                     | MUST     |
| Reading        | Passage, questions, autosave, scoring        | MUST     |
| Listening      | Audio, questions, scoring, review transcript | MUST     |
| Vocabulary     | Save words + context                         | MUST     |
| Error Notebook | Lưu lỗi và explanation                       | MUST     |
| SRS            | Due/review flow cơ bản                       | MUST     |
| Dashboard      | Today tasks + progress                       | MUST     |
| Content Admin  | Nhập/sửa/publish content cơ bản              | MUST     |
| Analytics      | Core product events + usage metrics          | MUST     |

## 4.3. SHOULD — sau MVP validation

- Writing AI.
- Speaking AI.
- Better adaptive planning.
- Mock Test.
- Rich analytics.
- Notifications.
- Streak/XP.

## 4.4. LATER

- Billing.
- Pro/paid quotas.
- Advanced pronunciation pipeline.
- HLS/AES audio delivery.
- Mobile app.
- Large-scale worker topology.
- Advanced proctoring.
- Advanced recommendation engine.

## 4.5. MVP exit criteria

MVP chỉ được coi là **Ready for Beta** khi:

```text
[ ] Core user journey hoạt động end-to-end
[ ] Auth hoạt động
[ ] Diagnostic → Study Plan hoạt động
[ ] Reading end-to-end hoạt động
[ ] Listening end-to-end hoạt động
[ ] Error Notebook hoạt động
[ ] SRS hoạt động
[ ] Dashboard hoạt động
[ ] Admin có thể publish content
[ ] Answer key không lộ cho client
[ ] RLS test pass
[ ] Typecheck pass
[ ] Lint pass
[ ] Unit/integration tests pass
[ ] Error monitoring hoạt động
[ ] Backup/restore procedure được kiểm chứng
[ ] Có analytics event cho core learning loop
```

---

# 5. PRODUCT REQUIREMENTS BY MODULE

## 5.1. Identity, Onboarding & Adaptive Planning

### Onboarding Wizard

Thu thập:

- CEFR / điểm gần nhất.
- Target Overall Band.
- Target band từng skill.
- Ngày thi dự kiến.
- Thời gian học 15/30/60/120 phút hoặc giá trị tùy chọn.

### Diagnostic Test

- Mini-test khoảng 25 phút.
- Đánh giá nhanh 4 skill theo capability hiện có của content.
- Sinh initial skill profile.
- Chỉ dùng kết quả diagnostic làm baseline; không coi là IELTS official score.

### Adaptive Study Plan

Công thức baseline:

$$
\Delta_{band} = Target\ Band - Current\ Band
$$

Plan phải tối ưu theo:

- thời gian học thực tế;
- skill yếu;
- lịch sử hoàn thành;
- due reviews;
- exam date nếu có.

### Dynamic Reschedule

Khi user bỏ lỡ lịch:

```text
Missed tasks
   ↓
Recalculate workload
   ↓
Protect high-priority tasks
   ↓
Move low-priority tasks
   ↓
Avoid impossible daily workload
```

Không được tạo một plan “đẹp trên giấy” nhưng không thể hoàn thành.

---

## 5.2. Reading Engine

- Split View.
- Highlight.
- Notes.
- Dictionary lookup.
- Debounced autosave.
- Server-side attempt state.
- Deterministic scoring.
- Review after submission.
- Error extraction.

### Acceptance criteria chính

```text
[ ] Start attempt tạo server record
[ ] Answer được autosave
[ ] Refresh không mất progress
[ ] Submit chỉ một lần theo contract
[ ] Score tính ở server
[ ] Answer key không exposed
[ ] Result được versioned
[ ] Wrong answers tạo error entries
```

---

## 5.3. Listening Engine

### MVP

- Audio player.
- Controlled playback theo mode.
- Questions đồng bộ với audio.
- Autosave.
- Review transcript ở phase phù hợp.
- Timestamp support.

### Target architecture

- Audio streaming.
- HLS.
- AES-128 protected segments nếu business/content requirements thực sự cần.
- Interactive timestamped transcript.
- Exam mode giới hạn playback.

Audio DRM/protection phải được triển khai theo mức bảo vệ tương xứng với giá trị content, tránh overengineering trong beta.

---

## 5.4. Writing Engine

### MVP

- Plain text editor.
- Live word count.
- Task 1/Task 2 limits.
- Autosave.
- Submit/review.

### Phase AI

- Pre-validation.
- Cache check.
- Structured LLM evaluation.
- Output schema validation.
- Criterion scores.
- Actionable feedback.
- Rewrite support.

---

## 5.5. Speaking Engine

### MVP

- Mic permission.
- Recording.
- Visualizer.
- Part 1/2/3 flow.
- Audio submission.

### Phase AI

- STT.
- Pause analysis.
- WPM.
- Filler word detection.
- Pronunciation analysis.
- LLM evaluation.
- Audio-level feedback.

---

## 5.6. SRS & Error Notebook

### SRS

Áp dụng cho:

- vocabulary;
- grammar errors;
- collocations/idioms;
- selected reading/listening mistakes.

Baseline schedule có thể bắt đầu đơn giản:

```text
Again → 1 day
Hard  → 3 days
Good  → 7 days
Easy  → 15 days
```

Sau khi có usage data mới cân nhắc FSRS đầy đủ.

### Error Notebook

Mỗi error entry có thể lưu:

- test;
- question;
- skill;
- user answer;
- correct answer nếu được phép hiển thị;
- explanation;
- error tag;
- resolved status;
- retry count.

---

# 6. DASHBOARD & INFORMATION ARCHITECTURE

## 6.1. Dashboard phải trả lời 5 câu hỏi

1. Hôm nay tôi cần làm gì?
2. Tôi đang yếu ở đâu?
3. Tôi vừa tiến bộ gì?
4. Có gì cần ôn hôm nay?
5. Tôi có đang đi đúng hướng với target không?

## 6.2. Suggested navigation

```text
Home / Today
Practice
  ├── Reading
  ├── Listening
  ├── Writing
  └── Speaking
Review
  ├── SRS
  └── Error Notebook
Progress
Mock Test
Profile / Plan
```

Admin:

```text
Admin Dashboard
Content
Questions
Answer Keys
Audio
AI Evaluation
Users
Reports
System Health
```

---

# 7. CONTENT STRATEGY

## 7.1. Content is a first-class product asset

Question bank và explanation quan trọng không kém code. Mỗi content item phải có metadata đủ để recommendation, analytics và versioning hoạt động.

## 7.2. Content model tối thiểu

```text
Content
├── skill
├── level / difficulty
├── topic
├── question type
├── prompt / passage / audio
├── answer key
├── explanation
├── tags
├── source / provenance
├── version
├── status: draft / review / published / archived
└── created_at / updated_at
```

## 7.3. Content workflow

```text
Draft
  ↓
Author Review
  ↓
Answer-key Validation
  ↓
QA
  ↓
Publish
  ↓
Usage Analytics
  ↓
Revision / Archive
```

## 7.4. Content quality rules

Không publish content nếu:

- thiếu answer key;
- answer key không deterministic;
- explanation không khớp đáp án;
- audio/transcript timestamp không hợp lệ;
- question có ambiguity chưa được review.

---

# 8. ANALYTICS & KPI

## 8.1. Product metrics

### Acquisition / Activation

- Sign-up rate.
- Onboarding completion.
- Diagnostic completion.
- First lesson completion.

### Engagement

- DAU/WAU.
- Sessions per user.
- Lessons completed.
- Practice completion rate.
- Review completion rate.

### Retention

- D1 retention.
- D7 retention.
- D30 retention.
- Weekly active learners.

### Learning

- Skill-level trend.
- Error recurrence.
- SRS retention signals.
- Study-plan completion.
- Time spent by skill.

### AI

- AI submissions/user.
- AI success/failure.
- Average latency.
- Token consumption.
- Cost/submission.
- User correction/acceptance of AI feedback.

## 8.2. Core event taxonomy

```text
user_signed_up
onboarding_completed
diagnostic_started
diagnostic_completed
study_plan_generated
lesson_started
lesson_completed
question_answered
attempt_submitted
error_created
review_started
review_completed
writing_submitted
writing_feedback_viewed
speaking_submitted
speaking_feedback_viewed
mock_started
mock_completed
```

## 8.3. Product review cadence

Mỗi iteration phải trả lời:

```text
What feature was used?
Who used it?
Did they finish it?
Did they return?
Where did they drop?
What did users complain about?
What should be removed / simplified / improved?
```

---

# 9. MONETIZATION & UNIT ECONOMICS

Monetization chỉ bật sau khi core learning loop có người dùng thực tế.

## 9.1. Candidate tiers

```text
FREE
├── Core practice
├── Limited AI
└── Basic SRS

PRO_MONTHLY
├── Higher AI quotas
├── Advanced analytics
├── Advanced feedback
└── More mock tests

PRO_YEARLY
└── Same feature family, different billing cycle

LIFETIME
└── Only if economics remain sustainable
```

## 9.2. Cost model

Theo dõi tối thiểu:

```text
Monthly Cost
├── Supabase DB
├── Supabase Storage
├── CDN / Edge
├── AI LLM
├── Speech / STT
├── Email
├── Monitoring
└── Payment fees
```

Theo dõi thêm:

```text
Cost / active user
Cost / AI writing
Cost / AI speaking
Cost / retained user
Gross margin estimate by tier
```

## 9.3. Guardrails

AI endpoints phải có quota/rate limit trước khi mở cho public.

Không cho user tự tạo chi phí AI không giới hạn.

---

# 10. TECHNICAL ARCHITECTURE

## 10.1. Architecture principle

Sử dụng **Modular Monolith** làm kiến trúc mặc định ở giai đoạn đầu. Chỉ tách service khi có bottleneck hoặc yêu cầu vận hành rõ ràng.

```text
+---------------------------------------------------------------------------------+
|                       IELTS EDTECH PLATFORM CORE ECOSYSTEM                      |
+---------------------------------------------------------------------------------+
| [1] Identity, Onboarding & Adaptive Study Plan                                 |
| [2] 4-Skills Practice Engines (Reading - Listening - Writing - Speaking)        |
| [3] Mock Test & Exam Simulation Engine                                         |
| [4] AI Evaluation & Multimodal Feedback Engine                                  |
| [5] Spaced Repetition System (SRS Vocab & Intelligent Errors Notebook)         |
| [6] Analytics, Diagnostic & Band Prediction Engine                              |
| [7] Gamification, Notification & Retention Loops                                |
| [8] Monetization, Quotas, Payment & Admin/CMS Engine                            |
+---------------------------------------------------------------------------------+
```

## 10.2. Service topology

```text
+---------------------------------------------------------------------------------+
|                                 CLIENT APPLICATIONS                              |
|       Next.js 16 Web App (PWA)       |       Mobile App (later)                 |
+---------------------------------------------------------------------------------+
                                       | HTTPS / WSS
                                       v
+---------------------------------------------------------------------------------+
|                           EDGE / GATEWAY INFRASTRUCTURE                         |
|       Cloudflare WAF / DDoS Shield   |   Rate Limiting                          |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|                           APPLICATION SERVER (Next.js)                          |
|  - App Router / Server Actions / RPC                                            |
|  - Auth Verification & Session Guard                                            |
|  - Domain Services                                                               |
|  - Content Delivery / Study Plan / Mock Engine                                  |
+---------------------------------------------------------------------------------+
       |                         |                         |
       v                         v                         v
+------------------+     +-------------------+     +----------------------------+
| Supabase Postgres|     | Async Jobs        |     | Supabase Storage          |
| RLS + private    |     | Redis/BullMQ when  |     | Private audio/submissions |
| schema           |     | load requires it   |     | + public content          |
+------------------+     +-------------------+     +----------------------------+
                                  |
                 +----------------+-------------------------+
                 |                |                         |
                 v                v                         v
          AI Evaluation    Speech / Audio              Notification/Payment
```

## 10.3. Service catalog

| Tên Dịch Vụ                    | Phân Loại         | Công Nghệ / Nhà Cung Cấp                     | Trách Nhiệm Kỹ Thuật              |
| ------------------------------ | ----------------- | -------------------------------------------- | --------------------------------- |
| Auth & Identity Service        | Quản lý định danh | Supabase Auth                                | Authentication, sessions, RBAC    |
| Edge WAF & Security Service    | Cổng bảo mật      | Cloudflare                                   | DDoS, WAF, TLS, headers           |
| Content Delivery & Database    | CSDL lõi          | PostgreSQL / Supabase                        | Data, RLS, answer-key isolation   |
| Media & Audio Storage          | File storage      | Supabase Storage                             | Audio/content/submission files    |
| Async Worker & Job Queue       | Tác vụ chậm       | DB queue initially; Redis/BullMQ when needed | AI jobs, report jobs              |
| Speech-to-Text & Pronunciation | Audio processing  | Whisper + speech provider                    | STT, pronunciation signals        |
| AI LLM Evaluation Service      | AI evaluation     | OpenAI / Anthropic                           | Structured scoring + feedback     |
| AI Observability               | AI ops            | Langfuse / equivalent                        | Cost, traces, latency, guardrails |
| Payment & Billing              | Monetization      | SePay / VietQR / VNPay / Stripe candidates   | Payment/webhooks                  |
| Notification                   | Retention         | Resend / Zalo ZNS / Firebase candidates      | Email/push/message                |

---

# 11. DATABASE DESIGN

## 11.1. Core principles

- User-owned data isolated by RLS.
- Answer keys in protected `private` schema.
- Content and submissions versioned/immutable where historical correctness matters.
- Server-side scoring.
- Idempotent submission and job processing.

## 11.2. Core extensions

```sql
-- 1. BẢNG QUẢN LÝ QUOTA & GÓI TÀI KHOẢN
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL DEFAULT 'FREE' CHECK (tier IN ('FREE', 'PRO_MONTHLY', 'PRO_YEARLY', 'LIFETIME')),
    writing_tokens_remaining INT NOT NULL DEFAULT 3,
    speaking_tokens_remaining INT NOT NULL DEFAULT 3,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SRS
CREATE TABLE public.user_vocab_srs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    phonetic VARCHAR(100),
    definition TEXT NOT NULL,
    context_sentence TEXT,
    stability REAL NOT NULL DEFAULT 2.0,
    difficulty REAL NOT NULL DEFAULT 5.0,
    reps INT NOT NULL DEFAULT 0,
    lapses INT NOT NULL DEFAULT 0,
    due_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reviewed TIMESTAMPTZ,
    UNIQUE(user_id, word)
);

-- 3. ERROR NOTEBOOK
CREATE TABLE public.error_notebook_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id UUID NOT NULL,
    question_id UUID NOT NULL,
    skill VARCHAR(20) NOT NULL CHECK (skill IN ('READING', 'LISTENING', 'WRITING', 'SPEAKING')),
    user_answer TEXT,
    correct_answer TEXT,
    explanation TEXT,
    error_tag VARCHAR(50),
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. AI JOBS
CREATE TABLE public.ai_evaluation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    submission_id UUID NOT NULL,
    job_type VARCHAR(20) NOT NULL CHECK (job_type IN ('WRITING_EVAL', 'SPEAKING_EVAL')),
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')),
    payload JSONB NOT NULL,
    result JSONB,
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 11.3. RLS baseline

```sql
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vocab_srs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_notebook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_evaluation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_access_own_vocab ON public.user_vocab_srs
    FOR ALL USING (auth.uid() = user_id);
```

Production implementation phải kiểm thử cả **positive access** và **cross-user denial**.

---

# 12. AI EVALUATION PIPELINE

## 12.1. Writing

```text
[Submission]
      ↓
[Pre-validation & Guardrails]
      ├── Length check
      ├── Language check
      └── Prompt-injection screening
      ↓
[Cache Check]
      ↓
[LLM Evaluation]
      ├── IELTS rubric context
      └── Structured JSON
      ↓
[Schema Validation]
      ↓
[Scoring]
      ├── Task Achievement / Task Response
      ├── Coherence & Cohesion
      ├── Lexical Resource
      └── Grammatical Range & Accuracy
      ↓
[Actionable Feedback]
      ↓
[Persist + Audit]
```

## 12.2. Speaking

```text
                    [User Audio]
                          |
              +-----------+-----------+
              |                       |
              v                       v
        [Audio analysis]        [STT transcript]
              |                       |
              v                       v
   pronunciation signals      text / pause signals
              \                       /
               \                     /
                +---------+---------+
                          v
                  [Context JSON]
                          ↓
                  [LLM Evaluation]
                          ↓
             FC / LR / GRA / PR feedback
```

AI evaluation phải được coi là **assistive scoring/feedback product capability**, không mặc định thay thế examiner hoặc chứng nhận band chính thức.

---

# 13. SECURITY & ANTI-TAMPER

Hệ thống giữ mô hình kiểm soát **Zero-Trust** theo baseline hiện tại.

```text
+---------------------------------------------------------------------------------+
|                       ZERO-TRUST APP SECURITY MATRIX                            |
+---------------------------------------------------------------------------------+
| 1. Answer Key Cloaking: Schema `private`                                      |
| 2. Server-side Authority: Client gửi answers, không gửi score                 |
| 3. Tamper-proof Submissions: HMAC SHA-256 khi cần integrity verification       |
| 4. Ephemeral Storage: Audio submission lifecycle                              |
| 5. Strict Rate Limiting: AI endpoints                                         |
+---------------------------------------------------------------------------------+
```

## 13.1. Answer key protection

- `exam_answers` trong schema `private`.
- Client không có quyền `SELECT` trực tiếp.
- Scoring thực hiện ở server/database protected function tùy implementation.

## 13.2. Server-authoritative timer

Baseline contract:

$$
submitted\_at \le started\_at + duration\_seconds + grace\_period
$$

Grace period baseline trong architecture hiện tại: 30 giây.

## 13.3. Rate limiting

Baseline hiện tại:

- tối đa 3 Writing submissions / 10 phút / user;
- Token Bucket theo IP và User ID;
- quota cho AI;
- audit failed requests.

## 13.4. Secrets

Secrets không được gửi xuống client.

Các secret contract phải được kiểm tra bằng automated validation trước deployment.

---

# 14. TESTING STRATEGY

## 14.1. Test pyramid

```text
                 E2E
              /       \
        Integration  Security
          /               \
       Unit             Database/RLS
```

## 14.2. Required checks

```text
[ ] Typecheck
[ ] Lint
[ ] Unit tests
[ ] Integration tests
[ ] Database/RLS tests
[ ] Money audit
[ ] Order/state audit nếu có billing
[ ] Build
[ ] Dependency audit
[ ] Security regression
```

## 14.3. Test invariants

Đặc biệt phải khóa các invariant:

- user A không đọc được private data của user B;
- client không tự gửi score để được server chấp nhận;
- expired attempt không thể submit hợp lệ;
- retry job không tạo duplicate result;
- payment webhook idempotent;
- answer-key update không làm thay đổi historical submission interpretation.

---

# 15. OBSERVABILITY & OPERATIONS

## 15.1. Required telemetry

- application logs;
- error tracking;
- request latency;
- DB health;
- worker queue depth;
- AI latency;
- AI cost;
- failed jobs;
- payment webhook errors;
- storage errors.

## 15.2. Alerts

Ưu tiên alert cho:

```text
5xx spike
Auth failure spike
DB connection exhaustion
Queue backlog
AI provider failure
Payment webhook failure
Storage upload failure
Unexpected cost spike
```

## 15.3. Backup & Recovery

Baseline target:

- Supabase PITR nếu plan/hạ tầng hỗ trợ.
- Daily cold dump.
- Restore drill định kỳ.
- RPO/RTO phải được viết thành con số trước khi coi production-ready.

---

# 16. BETA PROGRAM & REAL-USER LOOP

## 16.1. Beta strategy

Không bắt đầu bằng một public launch lớn.

```text
Internal / personal use
        ↓
5–10 real users
        ↓
Fix critical UX/content issues
        ↓
20–50 users
        ↓
Measure D1/D7 + core loop
        ↓
100+ users nếu tín hiệu tốt
        ↓
Monetization experiment
```

Con số trên là **mốc vận hành đề xuất**, không phải prediction về khả năng tăng trưởng.

## 16.2. Beta feedback form

Mỗi user beta cần có cách báo:

- bug;
- question ambiguity;
- wrong answer key;
- AI feedback không hữu ích;
- UX confusion;
- feature request.

## 16.3. Weekly product review

Mỗi tuần tổng hợp:

```text
Top usage flows
Top drop-off points
Top bugs
Top content problems
Top user requests
Retention signals
AI cost
Infrastructure incidents
```

Chỉ thay đổi roadmap khi có evidence hoặc một technical risk có mức độ nghiêm trọng cao.

---

# 17. PHASED DELIVERY ROADMAP

## PHASE 0 — FOUNDATION / AUDIT CLOSURE

### Goal

Ổn định baseline hiện tại trước khi mở thêm feature.

### Tasks

- Close các audit blockers hiện có.
- Verify production environment separation.
- Verify secret contracts.
- Verify backups and restore path.
- Verify monitoring.
- Verify CI/build/test baseline.

### Exit criteria

```text
[ ] Production/staging env separation verified
[ ] Database migration process verified
[ ] Security tests pass
[ ] Build pass
[ ] Monitoring baseline pass
[ ] Recovery path documented
```

---

## PHASE 1 — MVP LEARNING CORE

### Goal

Ra sản phẩm tối thiểu có learning loop.

### Scope

- Auth.
- Onboarding.
- Diagnostic.
- Study Plan.
- Reading.
- Listening.
- Vocabulary.
- Error Notebook.
- SRS.
- Dashboard.
- Admin/CMS tối thiểu.
- Product analytics.

### Do not add

- Billing.
- Mobile.
- Advanced pronunciation.
- Large-scale queue infrastructure.
- Full gamification.

### Exit criteria

Một user có thể đi từ **register → diagnostic → plan → practice → review → return next day** mà không cần manual intervention.

---

## PHASE 2 — AI LEARNING ASSISTANT

### Goal

Tăng giá trị của Writing/Speaking bằng feedback AI.

### Tasks

- AI job queue.
- Writing evaluation.
- Speaking STT.
- Pronunciation signals.
- Structured outputs.
- AI observability.
- Cost guardrails.

### Exit criteria

```text
[ ] Successful evaluation path
[ ] Failed evaluation recovery
[ ] Idempotency
[ ] Rate limiting
[ ] Cost tracking
[ ] User can understand feedback
```

---

## PHASE 3 — MOCK TEST + DIAGNOSTICS 2.0

### Goal

Tạo exam simulation và analytics sâu hơn.

### Tasks

- Full mock test.
- Server-authoritative section transitions.
- Better diagnostic model.
- Skill analytics.
- Historical comparisons.

### Exit criteria

```text
[ ] Attempt integrity verified
[ ] Timer integrity verified
[ ] Section transitions server-authoritative
[ ] Result reporting stable
```

---

## PHASE 4 — RETENTION & MONETIZATION

### Goal

Biến core product thành sản phẩm có economics rõ ràng.

### Tasks

- Free/Pro tiers.
- Quotas.
- Payment webhooks.
- Notification.
- Streak/XP nếu beta data cho thấy hữu ích.
- Advanced analytics.

### Exit criteria

```text
[ ] Pricing/quotas enforceable
[ ] Payment idempotent
[ ] Refund/state transitions safe
[ ] AI spend controlled
[ ] User-facing subscription state consistent
```

---

## PHASE 5 — SCALE & GO-LIVE HARDENING

### Goal

Tăng reliability theo tải thực tế, không scale theo giả định.

### Tasks

- Move heavy jobs to Redis/BullMQ nếu DB-backed queue trở thành bottleneck.
- Cloudflare WAF/rate limiting.
- Advanced storage delivery/HLS nếu cần.
- Load testing.
- Capacity planning.
- Cold backups.
- Incident runbooks.

### Load tests

Baseline architecture từng đề xuất mô phỏng 2.000 học viên Mock Test và 200 Writing submissions đồng thời. Đây là **scenario để validation**, không phải điều kiện bắt buộc của MVP.

### Exit criteria

```text
[ ] SLO/SLA targets defined
[ ] Load test report available
[ ] Bottlenecks identified
[ ] Recovery drill completed
[ ] Incident runbooks ready
[ ] Cost under defined budget ceiling
```

---

# 18. ORIGINAL ARCHITECTURE REVIEW — PRESERVED DECISIONS & GAPS

Phần này giữ lại các phát hiện quan trọng của baseline architecture, nhưng đặt chúng vào đúng thứ tự product.

## 18.1. Strengths đã có

### Security & Anti-tamper by Design

- Private schema cho Answer Key.
- Server-side timer authority.
- Signed URL ngắn hạn cho audio.
- HMAC verification cho payload khi cần.

### Immutability & Auditability

- Content versioning.
- Submission history integrity.

### Pragmatic Architecture

- Modular Monolith.
- PostgreSQL làm core database.
- Database-backed queue chỉ ở mức tải phù hợp.
- Redis/BullMQ là scale path, không phải mandatory day-one.

### Test Rigor

- pgTAP/RLS.
- Unit/integration/security regression.

## 18.2. Gaps cần xử lý theo phase

1. Listening Engine chuyên biệt → Phase 1.
2. Speaking multimodal pipeline → Phase 2.
3. Queue scalability → Phase 5 khi workload chứng minh nhu cầu.
4. Billing/quotas → Phase 4.
5. SRS → Phase 1.
6. Retention/gamification → Phase 4 sau khi có user data.

---

# 19. PRODUCTION READINESS CHECKLIST

## Product

```text
[ ] Core learning loop proven with real users
[ ] Critical UX flows stable
[ ] Content QA process active
[ ] Feedback channel active
[ ] Analytics events verified
[ ] Support process defined
```

## Security

```text
[ ] RLS verified
[ ] Secrets protected
[ ] Rate limiting verified
[ ] Answer key isolation verified
[ ] Server-side scoring verified
[ ] Timer enforcement verified
[ ] Audit logs sufficient
```

## Data

```text
[ ] Backup active
[ ] Restore tested
[ ] Migration rollback/forward strategy documented
[ ] Versioning verified
[ ] Data retention policy defined
```

## Reliability

```text
[ ] Error monitoring
[ ] Alerts
[ ] Health checks
[ ] Incident runbook
[ ] Queue recovery
[ ] AI provider failure strategy
```

## Economics

```text
[ ] AI cost/user known
[ ] Storage cost/user estimated
[ ] Monthly infrastructure budget defined
[ ] Quotas enforceable
[ ] Payment reconciliation strategy defined
```

---

# 20. DEFINITION OF DONE — UNIVERSAL FEATURE CONTRACT

Một feature chỉ được coi là **DONE** khi đủ:

```text
1. Product Requirement
   ↓
2. UX / User Flow
   ↓
3. UI implementation
   ↓
4. API / Server logic
   ↓
5. Database / Migration
   ↓
6. Authorization / RLS
   ↓
7. Error handling
   ↓
8. Observability
   ↓
9. Automated tests
   ↓
10. Manual acceptance
   ↓
11. Documentation
```

Không đánh dấu feature “done” chỉ vì UI chạy được.

---

# 21. ENGINEERING RULES FOR AI CODING AGENTS

Tài liệu này là Source of Truth cho Codex/Claude hoặc coding agents khi triển khai.

## 21.1. Before editing

Agent phải:

- đọc relevant docs;
- inspect existing implementation;
- xác định current branch/state;
- kiểm tra test/build contract liên quan;
- không sửa code khi chưa hiểu dependency.

## 21.2. Implementation

- Không thêm feature ngoài scope.
- Không thay đổi architecture chỉ để “clean up”.
- Ưu tiên patch nhỏ, có thể review.
- Không bypass security vì tiện.
- Không hardcode secrets.
- Không commit generated credentials.

## 21.3. Verification

Sau mỗi phase:

```text
typecheck
lint
unit tests
integration tests
security/RLS tests
build
relevant smoke tests
```

Agent phải báo **evidence**, không chỉ báo “pass”.

## 21.4. Audit rule

Nếu phát hiện conflict giữa implementation và Master Plan:

```text
STOP
↓
Identify conflict
↓
Show current behavior
↓
Show intended contract
↓
Choose smallest safe resolution
↓
Update source-of-truth if decision changes
```

---

# 22. RELEASE MANAGEMENT

## Branch model

```text
main
  ↑
release/*
  ↑
feature/*
```

Quy tắc:

- `main` phải deployable.
- Release candidate phải có evidence.
- Không merge khi tests critical fail.
- Production release phải truy được commit SHA.

## Release evidence pack

Mỗi release cần lưu:

```text
Commit SHA
CI run
Build result
Test result
Migration result
Security result
Smoke test result
Known limitations
Rollback plan
```

---

# 23. INITIAL BACKLOG

## P0

```text
P0-001 Auth + profile
P0-002 Onboarding
P0-003 Diagnostic
P0-004 Study Plan
P0-005 Reading Engine
P0-006 Listening Engine
P0-007 Error Notebook
P0-008 SRS
P0-009 Dashboard
P0-010 Admin/CMS
P0-011 Analytics
P0-012 Production baseline
```

## P1

```text
P1-001 Writing AI
P1-002 Speaking AI
P1-003 Better adaptive planning
P1-004 Mock Test
P1-005 Advanced analytics
```

## P2

```text
P2-001 Billing
P2-002 Notification
P2-003 Gamification
P2-004 Mobile app
P2-005 Advanced media protection
P2-006 Scale-out worker topology
```

---

# 24. DECISION LOG

Các quyết định kiến trúc/product quan trọng phải được ghi tại đây với format:

```text
DECISION-ID
Date:
Context:
Decision:
Why:
Alternatives considered:
Impact:
Revisit condition:
```

Những thay đổi lớn đối với MVP scope, pricing, AI provider, storage strategy, queue architecture hoặc security contract đều phải có decision record.

---

# 25. MASTERPLAN SUMMARY

```text
                           PRODUCT VISION
                                │
                                ▼
                         TARGET USERS
                                │
                                ▼
                            MVP CORE
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
          Practice           Review           Progress
              │                 │                 │
              └─────────────────┼─────────────────┘
                                ▼
                         REAL USER BETA
                                │
                                ▼
                         PRODUCT METRICS
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
                 Improve                 Validate
                    │                       │
                    └───────────┬───────────┘
                                ▼
                           AI FEATURES
                                ↓
                           MOCK TEST
                                ↓
                     RETENTION + MONETIZATION
                                ↓
                      SCALE + GO-LIVE HARDENING
```

## Final operating principle

> **Build the smallest complete learning loop that real users can use, measure it, improve it, then scale the architecture only when product evidence or reliability requirements justify the complexity.**

Đây là nguyên tắc ưu tiên xuyên suốt Master Plan này.
