# Identity "Token Forge" (JWT Breaker) Plan

## Overview
A dedicated console for visualizing, analyzing, and exploiting JSON Web Tokens (JWT). This tool educates users on common authentication vulnerabilities by allowing them to tamper with tokens and attempt signature bypass attacks.

## User Experience
1.  **Dashboard:** A split-pane view.
    *   **Left (Input):** A large text area to paste a JWT.
    *   **Right (Analysis):** Decoded Header, Payload, and Signature components.
2.  **Interaction:**
    *   User modifies the Payload (e.g., changes `sub` or `role`).
    *   User selects an Attack Method:
        *   **None Alg:** Changes header to `{"alg": "none"}` and strips signature.
        *   **Weak Key:** Re-signs using a dictionary word (e.g., "secret", "password").
        *   **Key Confusion:** Attempts HMAC signing using the public key (RS256 -> HS256).
3.  **Verification:** User clicks "Test Token" to send it to a guarded backend endpoint.
4.  **Feedback:** Success (Auth Bypassed!) or Failure (Signature Invalid).

## Technical Architecture

### Frontend (`/identity`)
*   **Component:** `IdentityConsole.tsx`
*   **Libraries:** `jwt-decode` (or custom parser for learning), `lucide-react` icons.
*   **State:** Tracks `rawToken`, `decodedHeader`, `decodedPayload`, `attackMode`.

### Backend (`src/jwt-debug.ts`)
*   **Endpoints:**
    *   `POST /auth/verify`: Accepts a token, verifies it against the server's *real* secret, returns 200/401.
    *   `POST /auth/forge`: (Helper) Generates a valid token for the user to start with.
*   **Vulnerability Simulation:**
    *   The verification endpoint will *intentionally* have a flag (e.g., `ALLOW_NONE_ALG`) that can be toggled to make the attack successful for demonstration purposes.

## Implementation Steps
1.  **Backend:** Update `jwt-debug.ts` to support verification logic and vulnerable modes.
2.  **Frontend:** Build `TokenForge` UI with syntax highlighting for JSON.
3.  **Integration:** Wire up the "Test" button to the backend.
