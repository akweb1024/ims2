# Publication & Editorial System Implementation Plan

## Objective
To implement a complete, end-to-end publication and editorial system covering manuscript processing, editorial board management, issue management, and certification/rewards.

## Phase 1: Journal Infrastructure & Editorial Board
**Goal:** Establish the structural hierarchy (Journals -> Volumes -> Issues) and the people managing them (Editorial Board).

1.  **Database Updates**:
    *   Create `EditorialBoardMember` model (linked to Journal and User/External Profile).
    *   Ensure `JournalVolume` and `JournalIssue` are fully supported in the UI.

2.  **Journal Management UI (`/dashboard/journals/[id]`)**:
    *   **Overview Tab**: Basic stats.
    *   **Editorial Board Tab**: Add/Remove Editors, Chief Editors, Section Editors.
    *   **Volumes & Issues Tab**:
        *   Create new Volumes.
        *   Create new Issues within Volumes.
        *   Manage Issue status (Planned, Open, Closed, Published).

## Phase 2: Advanced Manuscript Processing
**Goal:** Enhance the submission and review workflow to support profesional standards.

1.  **Submission Improvements**:
    *   Multi-step submission form (Metadata, Authors, Files, Suggestions).
    *   File versioning (Revision 1, Revision 2).

2.  **Editorial Workflow (`/dashboard/editorial`)**:
    *   **Screening**: Editor accepts/rejects before review.
    *   **Review Rounds**: Support multiple rounds of reviews (e.g., "Major Revision" -> Author submits v2 -> Reviewers check v2).
    *   **Production**: Assign Accepted articles to a specific `JournalIssue`.
    *   **Publication**: Publish the Issue, making all assigned articles "Published".

## Phase 3: Certificates & Rewards
**Goal:** Recognize contributions of Authors, Reviewers, and Editors.

1.  **Certificate System**:
    *   **Models**: `Certificate` (Type: REVIEWER, EDITOR, AUTHOR, BEST_PAPER).
    *   **Templates**: customizable HTML/CSS templates for certificates.
    *   **Generation**: Auto-generate PDF/Image certificates upon trigger (e.g., "Article Published", "Review Completed").

2.  **User Rewards**:
    *   **My Certificates** section in User Profile.
    *   **Public Verification**: Public URL to verify certificate validity.

## Phase 4: Public View & Access
**Goal:** The reader-facing experience.

1.  **Journal Homepage**:
    *   About, Editorial Board list.
    *   Current Issue view.
    *   Archives (Past Volumes/Issues).
    *   Article View (Abstract, PDF download).

---

## Immediate Next Steps (Phase 1)
1.  Define `EditorialBoardMember` in Prisma.
2.  Update `Journal` page to include tabs for "Editorial Board" and "Issues".
3.  Implement Volume/Issue CRUD operations.
