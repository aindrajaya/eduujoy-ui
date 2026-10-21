import { demoProfile, demoUser } from '@/fixtures/demo';
import Profile from './components/Profile';

// Static props for U0a; U2/U10 source the user from /v1/auth/me.
export default function AccountPage() {
  return <Profile profile={demoProfile} user={demoUser} />;
}
