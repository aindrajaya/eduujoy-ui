/**
 * Dashboard Layout Component
 */
'use client';

import LearningPathScreen from './screens/LearningPathScreen';
import ProfileScreen from './screens/ProfileScreen';
import ProTipsScreen from './screens/ProTipsScreen';

export default function Dashboard({
  currentView,
  setCurrentView,
  data,
  onModuleSelect,
  userInfo,
}) {
  const renderView = () => {
    switch (currentView) {
      case 'learn':
        return (
          <LearningPathScreen data={data} onModuleSelect={onModuleSelect} />
        );
      case 'profile':
        return <ProfileScreen data={data.profile_summary} userInfo={userInfo} />;
      case 'tips':
        return <ProTipsScreen data={data.pro_tips} />;
      default:
        return (
          <LearningPathScreen data={data} onModuleSelect={onModuleSelect} />
        );
    }
  };

  return <div className="pb-20">{renderView()}</div>;
}
