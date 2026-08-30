# Commercial Requests

An independent, synthetic workflow concept created by Sebastian Becerra with AI assistance for Natera's Forward Deployed AI Solutions Engineer application.

## The working loop

Choose one of three fictional commercial requests. Inspect its inputs and example proposal, resolve missing details, explicitly approve the current revision, run three local actions, and export a traceable handoff. The third scenario deliberately fails its first queue attempt; retry preserves completed actions. Editing an approved request invalidates its approval and creates a new revision.

The workflow engine, validation, versioned approvals, local handoff record, duplicate prevention, audit events, and export actually execute. AI proposals are pre-generated examples in a controlled replay. There is no live inference, production integration, customer deployment, measured ROI, or Natera endorsement. Demo policies and people are fictional.

## Privacy and scope

- Browser memory only. Refresh and reset clear all changes.
- No uploads, patient data, clinical recommendations, account, backend, analytics, cookies, or local storage.
- No external action or message is sent. Public reference links open only when clicked.
- Production CSP blocks data connections. Fonts, scripts, and styles are embedded in the standalone build.
- `noindex`, `nofollow`, `noarchive`, and `no-referrer` are set. These are indexing and referrer controls, not access control.

## Development

Use Node 22.12+ (verified with Node 25.2.1).

```sh
npm ci
npm run verify
npm run preview
```

`npm run build` creates the Vite output and a self-contained `docs/index.html`. The latter can be opened directly or served from GitHub Pages. `npm test` exercises the workflow state and safety boundaries. No runtime secrets are needed.

## Architecture

React UI → pure TypeScript workflow transitions → in-memory local action adapter → handoff and append-only session audit. Request edits advance a revision; review and approval are bound to that revision. An action is executed only when incomplete. A completed request cannot create a second handoff for the same revision. Exports preserve the audit history across revisions; reset clears the session intentionally.

A production version would require authorized identity and integrations, durable storage, real model evaluations, monitoring, security and privacy review, and validation with business users. The unit tests here evaluate workflow controls, not model quality or healthcare compliance.

## Public references

- Role: https://job-boards.greenhouse.io/natera/jobs/6115022004
- Brand and company context: https://www.natera.com/
- Resource library: https://www.natera.com/resource-library/?type=Clinician
- Oncology overview: https://www.natera.com/oncology/

Roboto Flex is distributed under the SIL Open Font License; see FONT-LICENSE.txt. Other third-party dependency licenses remain with their packages.
