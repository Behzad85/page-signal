# Magic UI public interface

USER_PROVIDED: replace the existing UI library with Magic UI. Preserve the four workspaces, reports, feedback persistence and private Postgres personas. No Figma URL exists.

Use Magic UI source components with shadcn/Radix controls for accessible form/dialog/tab/menu behavior. Remove Material UI/Emotion runtime dependencies; preserve the requested Material icon vector paths locally with attribution. Copy only free, licensed components.

Visual contract: cool white canvas (#fafbff), white surfaces, dark ink (#172033), indigo accent (#4f46e5), subtle neutral borders (#e2e6ef). Retain the 224px rail and mobile navigation, task-first page content and existing copy. Use system sans-serif headings, 44px desktop/34px mobile, tight tracking; fields have persistent labels above the control. Use 8px control/12px panel radii, light shadow on dialogs only. No new metrics or marketing sections.

Magic UI: Shimmer Button for primary actions, Number Ticker for measured report scores, Border Beam only while an analysis is active, static Dot Pattern in the heading backdrop. Prevent decoration from intercepting input or covering text. Disable animated effects for reduced motion and keep the actual score available to assistive technology.

Preserve validation, native form submission, disabled/busy states, accessible titles, focus traps, Escape/dismiss behavior, focus restoration, keyboard tab navigation and mobile overflow handling.

No built-in image-generation tool is available. Use this written component/token specification and rendered desktop/mobile review; do not claim a generated visual reference or pixel-match verification.
