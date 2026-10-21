import { Outlet } from 'react-router';

export default function RootLayout() {
  return (
    <div className="min-h-dvh bg-gray-100 antialiased">
      <div className="relative mx-auto min-h-dvh w-full max-w-md overflow-hidden bg-white shadow-lg">
        <Outlet />
      </div>
    </div>
  );
}
