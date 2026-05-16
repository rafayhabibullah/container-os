# Complete In-Progress Inspection — Design Spec

**Date:** 2026-05-16  
**Status:** Approved

## Overview

Add the ability to complete an in-progress inspection from the inspections table. In-progress inspections (those with `result = null`) show a "Continue" button. Clicking it opens a modal where the user fills out the checklist, updates notes and photos, then saves to mark the inspection complete.

## API Changes

### NestJS API

**New method — `InspectionService.completeInspectionRun(id, input)`**  
Located in `apps/api/src/modules/operations/inspection.service.ts`.

Input: `{ checklist, notes?, photoIds?, depositDeduction? }`

Behaviour:
- Computes overall result: `pass` if no checklist item has `result === 'fail'`, otherwise `fail`
- Updates the `inspectionRun` record: sets `checklist`, `notes`, `photoIds`, `depositDeduction`, `result`, and `completedAt = new Date()`
- If `kind === 'move_out'`, updates the unit status to `available` (pass) or `maintenance` (fail) — same side-effect as create

**New endpoint — `PATCH operator/v1/inspections/:id`**  
Located in `apps/api/src/modules/operations/operations.controller.ts`.  
Accepts the same body shape as the service input above.

### Next.js Web API Proxy

**New route — `PATCH /api/inspections/[id]`**  
Located at `apps/web/src/app/api/inspections/[id]/route.ts`.  
Forwards the request body to the NestJS PATCH endpoint with the org auth token. Returns the NestJS response as-is.

## UI Changes

### `InspectionsTable.tsx`

- Accept a new `onContinue: (inspection: InspectionRow) => void` prop
- In each table row where `insp.result === null`, render a "Continue" button after the result badge
- Button style: small, outlined (matching existing secondary button patterns in the codebase)
- Clicking calls `onContinue(insp)`

### `page.tsx`

- Add `selectedInspection: InspectionRow | null` state (default `null`)
- Pass `onContinue={(insp) => setSelectedInspection(insp)}` to `InspectionsTable`
- Render `<InspectionComplete>` when `selectedInspection` is non-null, passing the inspection and an `onClose` callback that sets state back to `null`

### `InspectionComplete.tsx` (new)

A modal component for completing an existing inspection.

**Props:** `{ inspection: InspectionRow; onClose: () => void }`

**Layout (top to bottom):**
1. Header: "Complete inspection" title + close button
2. Read-only summary: site ID, unit ID, kind — displayed as labelled chips, not inputs
3. Checklist: same pass/fail/N/A button rows as `InspectionActions`, pre-populated from `inspection.checklist`. Fail items show a note input.
4. Notes: pre-populated textarea from `inspection.notes`
5. Photos: pre-populated from `inspection.photoIds` (displayed as thumbnails); user can add more via the same upload flow as create
6. Deposit deduction: shown only when `inspection.kind === 'move_out'`
7. Footer: Cancel + "Save inspection" buttons

**Submit behaviour:**
- Calls `PATCH /api/inspections/[inspection.id]` with `{ checklist, notes, photoIds, depositDeduction? }`
- On success: calls `router.refresh()` then `onClose()`
- On error: shows inline error message

**Visual style:** matches `InspectionActions` exactly — same fonts, colours, border radii, backdrop blur, and entry animations.

## Out of Scope

- Editing completed (pass/fail) inspections
- Deleting inspections
- Changing site, unit, or inspection type on an existing inspection
