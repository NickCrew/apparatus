# "Ghost" API Mocker (Virtual Services) Plan

## Overview
A lightweight service virtualization tool allowing users to define ephemeral HTTP endpoints ("Ghosts") with configurable behaviors. This enables testing of microservice dependency failures without deploying real services.

## User Experience
1.  **Dashboard:** List of active Ghosts.
2.  **Builder:** Form to create a new Ghost.
    *   **Route:** e.g., `/api/checkout`
    *   **Method:** GET, POST, PUT, DELETE
    *   **Response Body:** JSON editor.
    *   **Behavior:**
        *   **Latency:** Fixed (ms) or Jitter (min-max).
        *   **Error Rate:** % chance to return 500.
3.  **Monitor:** Real-time counter of requests hitting the Ghost.

## Technical Architecture

### Frontend (`/ghosts`)
*   **Component:** `GhostConsole.tsx`
*   **Hook:** `useGhosts` (Fetch list, create, delete).

### Backend (`src/ghosting.ts`)
*   **Storage:** In-memory map of `route -> config`.
*   **Dynamic Router:**
    *   Express middleware that checks incoming requests against the Ghost map *before* standard routes.
    *   If match found:
        *   Apply Latency (setTimeout).
        *   Apply Error Rate (Math.random).
        *   Return configured JSON.
*   **Endpoints:**
    *   `GET /ghosts` (List)
    *   `POST /ghosts` (Create)
    *   `DELETE /ghosts/:id` (Remove)

## Implementation Steps
1.  **Backend:** Create `ghosting.ts` middleware and management API.
2.  **Frontend:** Build UI to define JSON payloads and slider controls for latency.
3.  **Integration:** Add global middleware in `app.ts`.
