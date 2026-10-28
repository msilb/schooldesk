# Contributing

Use fictional information in every fixture, test, screenshot and issue. Run
`npm ci`, `npm run typecheck`, `npm test`, `npm run check:release` and `npm run build`.
Before publishing, fetch all branches and tags and run `npm run check:history`.
It checks reachable Git history as well as staged and working files. Deleted
private files still count as a failure. The reviewed image manifest pins the
exact fictional screenshots and neutral icons; changing a binary requires a
fresh visual and metadata review before updating that manifest.

An operator can set `SCHOOLDESK_PRIVACY_DENYLIST` to a JSON array of private
strings kept **outside the repository**. The check reports only rule names and
file locations, never the matched values. Do not add real private values to tests,
ignore rules, scanner configuration or a public denylist. Automated checks
complement manual review and cannot prove that arbitrary content is non-private.
The default application mode is private; `npm run demo` explicitly starts the
fictional preview. Do not weaken the private-mode default to make setup easier.

Keep source adapters, presentation, storage and family state separate. Every
new API must explicitly choose its access boundary, enforce bounded inputs and
preserve private cache headers. Keep child/school-specific wording out of shared
components. Do not add a school connector without a clear permitted-access path.

Review both light and dark themes on desktop and a narrow phone viewport after
UI changes. Test keyboard/focus behaviour for dialogs and arrow/swipe media
navigation. Do not introduce a PDF extraction fallback that displays unreadable
text as a second version of an already prepared article.

By contributing, you agree to license your contributions under the MIT licence.

To enable automated GitHub checks, copy `docs/ci.example.yml` into
`.github/workflows/ci.yml` using a GitHub login/token permitted to manage
workflows. The template runs checks and builds the fictional demo, but never
publishes it. Hosting is a separate, explicit choice. Do not automatically
republish a retired preview: personal-account Pages sites may inherit a
personal website domain.
