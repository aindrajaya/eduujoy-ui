import LoadingScreen from '@/ui/LoadingScreen';

/** Hand-off after "Build my path" (U6). U7 replaces this with live staged progress over SSE. */
export default function GenerationPage() {
  return (
    <LoadingScreen
      title="Building your path…"
      message="Finding and checking the best free resources for your level. This takes about a minute."
    />
  );
}
