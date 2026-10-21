// Static demo data for the Account profile until U10 reads it from the API.
import type { LearnerProfile, UserInfo } from "@/features/account/types";

export const demoUser: UserInfo = { name: "Jane Doe", email: "jane.doe@example.com" };

export const demoProfile: LearnerProfile = {
  "goal": "Upgrade career growth in Product Design (UI/UX)",
  "currentLevel": "Intermediate",
  "focusArea": "Product Design (UI/UX)",
  "sessionDuration": "20 Minutes",
  "learningPace": "Slow",
  "contentPreference": "Audio Visual"
};
