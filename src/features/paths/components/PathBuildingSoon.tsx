import StateMessage from '@/ui/StateMessage';

/**
 * Shown instead of an error while path building is not open yet (isPathBuildingClosed). No link to
 * the placement: /progress cannot show it until A11 either. Restore "See your placement" (to
 * /progress) when A11 is deployed (shim-removal list in ../docs/status/ui.md).
 */
export default function PathBuildingSoon() {
  return (
    <StateMessage title="Your first path will appear here once path building opens">
      Your diagnostic result is saved.
    </StateMessage>
  );
}
