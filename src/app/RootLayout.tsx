import { Outlet } from 'react-router';

/** Phone-width column below 1024 px; full width from `lg`, where the tabs become a left rail. */
export default function RootLayout() {
  return (
    <div className="min-h-dvh bg-bg antialiased">
      <div className="relative mx-auto min-h-dvh w-full max-w-md bg-surface shadow-lg lg:max-w-none lg:bg-bg lg:shadow-none">
        <Outlet />
      </div>
    </div>
  );
}
