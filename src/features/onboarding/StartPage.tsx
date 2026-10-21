import { useNavigate } from 'react-router';
import OnboardingForm from './components/OnboardingForm';

// U0a: no API yet, so a valid submit goes straight to the demo path.
// U4 replaces this with POST /v1/topics/resolve.
export default function StartPage() {
  const navigate = useNavigate();
  return (
    <OnboardingForm
      onSubmit={() => {
        void navigate('/today');
      }}
    />
  );
}
