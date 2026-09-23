# Demonstration Feature Prompt

@planner Add shift handover bulk update to StoreOps activities.

Implement `PATCH /api/activities/bulk-status` so outgoing shift staff can mark multiple operational activities as DONE or BLOCKED in one request.

Requirements:
1. Accept an array of activity IDs and target status.
2. Only DONE and BLOCKED are valid target statuses.
3. Process each activity independently so one invalid/missing/unauthorized activity does not prevent valid activities from being updated.
4. Return successful and failed IDs with structured failure codes/messages.
5. Create one audit entry per successfully updated activity.
6. Emit the status-change event through EventBus; do not directly import a sibling notification/report service.
7. Preserve Routes → Service → Repository layering.
8. Use AppError for domain errors.
9. Add unit and integration tests that verify business rules, not just HTTP status codes.
10. Meet StoreOps coverage and automated-check thresholds.

The Planner must produce GIVEN/WHEN/THEN acceptance criteria and an explicit sprint contract. After review, the developer will type APPROVED before Generator execution.
