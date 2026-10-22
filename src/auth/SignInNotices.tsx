import Notice from '@/ui/Notice';
import SignOutFailedNotice from './SignOutFailedNotice';

export interface SignInNoticesProps {
  accountDeleted: boolean;
  reauth: boolean;
  expired: boolean;
}

/** The notices /signin shows after a redirect (lazy: sign-in itself never loads them). */
export default function SignInNotices({ accountDeleted, reauth, expired }: SignInNoticesProps) {
  return (
    <>
      <SignOutFailedNotice />
      {accountDeleted && (
        <Notice tone="success" role="status" className="mb-4">
          Your account and personal data have been deleted.
        </Notice>
      )}
      {reauth && (
        <Notice tone="warning" role="status" className="mb-4">
          For your security, sign in again to delete your account.
        </Notice>
      )}
      {expired && (
        <Notice tone="warning" role="status" className="mb-4">
          Your session expired. Sign in again to continue.
        </Notice>
      )}
    </>
  );
}
