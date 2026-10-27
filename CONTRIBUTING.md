# Contributing

Use fictional information in every fixture, test, screenshot and issue. Run
`npm ci`, `npm run typecheck`, `npm test`, `npm run check:release` and `npm run build`.
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
workflows. The template also deploys the fictional demo when GitHub Pages is
configured for Actions. The initial repository release uses branch-based Pages
publishing and does not require a workflow-enabled token.
