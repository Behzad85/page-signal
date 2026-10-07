import { PageHeading } from "../../components/design/AppShell";

export const metadata = { title: "Product overview | PageSignal" };

export default function AboutPage() {
  return (
    <main className="max-w-3xl text-ink-800">
      <PageHeading title="From evidence to a useful next step." description="PageSignal is an independently developed side project for exploring website quality and turning observations into practical work." />
      <p className="mt-6 text-lg leading-8 text-ink-700">
        PageSignal brings page audits, site sampling, competitor comparisons, and UX review into one workspace.
        Findings retain their evidence and can become prioritized tickets, CSV tables, or PDF reports.
      </p>
      <h2 className="mt-10 text-xl font-semibold text-ink-900">Choose a starting point</h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 leading-7">
        <li>Scan a website for technical, content, and performance opportunities.</li>
        <li>Audit a page against your target keywords.</li>
        <li>Compare your page with two competing URLs.</li>
        <li>Review UX using example or private saved personas and the evidence available.</li>
        <li>Organize feedback in a library stored in your current browser.</li>
      </ul>
      <h2 className="mt-10 text-xl font-semibold text-ink-900">Understand the evidence</h2>
      <p className="mt-4 leading-7 text-ink-700">
        Missing measurements stay visible. Reports can use local rules when AI is unavailable.
        Screenshot conclusions require verified consent handling. Recommendations are hypotheses to
        review and test; a score does not guarantee rankings, accessibility compliance, or better conversion.
      </p>
      <p className="mt-8 text-sm leading-6 text-ink-600">
        This is a demonstration product. The example personas and avatars are fictional and do not
        represent customer research. The interface was developed iteratively with AI assistance.
      </p>
    </main>
  );
}
