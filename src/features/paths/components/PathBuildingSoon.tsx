import { Link } from 'react-router';
import StateMessage from '@/ui/StateMessage';

/** Shown instead of an error while path building is not open yet (isPathBuildingClosed). */
export default function PathBuildingSoon() {
  return (
    <StateMessage
      title="Your first path will appear here once path building opens"
      action={
        <Link to="/progress" className="font-semibold text-primary underline">
          See your placement
        </Link>
      }
    >
      Your diagnostic result is saved.
    </StateMessage>
  );
}
