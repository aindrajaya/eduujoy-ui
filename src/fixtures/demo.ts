// Static demo data for U0a, taken from the original raw-ui.js mock.
// Screens receive it as props until the API module (U1) supplies real data.
import type { LearnerProfile, UserInfo } from "@/features/account/types";
import type { ActionPlan, PathModule } from "@/features/paths/types";

export const demoUser: UserInfo = { name: "Jane Doe", email: "jane.doe@example.com" };

export const demoProfile: LearnerProfile = {
  "goal": "Upgrade career growth in Product Design (UI/UX)",
  "currentLevel": "Intermediate",
  "focusArea": "Product Design (UI/UX)",
  "sessionDuration": "20 Minutes",
  "learningPace": "Slow",
  "contentPreference": "Audio Visual"
};

export const demoActionPlan: ActionPlan = {
  "quickStart": "Begin with Module 1 this week. Commit to watching the first YouTube video, even if it's in two 10-minute segments. Immediately start reflecting on the practice activity.",
  "dailyRoutine": "Set an alarm for 20 minutes each morning. Use the first 5-10 minutes to review notes or outline today's focus. Dedicate the next 10-15 minutes to a resource, pausing as needed. The final 5 minutes should be for quick notes or planning the next day's segment.",
  "progressTracking": "Keep a simple journal (digital or physical). After each 20-minute session, quickly jot down: 'What did I learn today?' and 'What's my next step?'"
};

export const demoModules: PathModule[] = [
  {
    "number": 1,
    "title": "Mastering Advanced UX Research & Strategy",
    "duration": "Week 1-2 (10-14 days)",
    "objective": "Deepen your understanding of qualitative and quantitative research methods, learn to derive strategic insights, and influence product decisions based on data. This moves beyond basic user interviews to more robust research practices.",
    "resources": [
      {
        "type": "YouTube",
        "name": "User Research Methods & Best Practices",
        "link": "https://www.youtube.com/watch?v=Fj-2tVw0d1g",
        "description": "This Nielsen Norman Group video breaks down various research methods with clear explanations and visual examples, perfect for a slow, audio-visual learner. Focus on understanding when and why to use each method.",
        "meta": "~10 minutes per segment (watch in 2-3 daily chunks)"
      },
      {
        "type": "Course",
        "name": "Conducting UX Research (Coursera)",
        "link": "https://www.coursera.org/learn/ux-research-google",
        "description": "Provides a structured, in-depth look at the entire UX research process. As an intermediate learner, focus on the nuances of planning, conducting, and analyzing research to extract actionable insights.",
        "meta": "Coursera (Google UX Design Professional Certificate)"
      },
      {
        "type": "Practice",
        "name": "Research Review & Critique",
        "description": "Identify a well-known app or website. For the next few days, dedicate 5-10 minutes of your session to analyzing its features. What research methods do you think they used? How could you validate or invalidate a recent feature change with a specific research method? Document your thoughts."
      }
    ]
  },
  {
    "number": 2,
    "title": "Elevating UI Design & Interaction Patterns",
    "duration": "Week 3-4 (10-14 days)",
    "objective": "Refine your UI design skills, focusing on advanced visual hierarchy, accessibility best practices, and understanding complex interaction patterns and design systems.",
    "resources": [
      {
        "type": "YouTube",
        "name": "A Beginner's Guide to Design Systems",
        "link": "https://www.youtube.com/watch?v=kYJjY8vQ62Y",
        "description": "Design systems are crucial for career growth in UI/UX. This video provides a clear, visual introduction, helping you understand the 'why' and 'how' of creating scalable, consistent UI.",
        "meta": "~15 minutes (watch the full video and re-watch sections slowly)"
      },
      {
        "type": "Course",
        "name": "UX Design: Accessibility",
        "link": "https://www.linkedin.com/learning/ux-design-accessibility",
        "description": "Accessibility is no longer a 'nice-to-have' but a fundamental skill. This course offers practical, visual guidance on designing inclusive experiences, a key differentiator for career advancement.",
        "meta": "LinkedIn Learning"
      },
      {
        "type": "Practice",
        "name": "UI Pattern Dissection",
        "description": "Choose a complex UI pattern (e.g., a multi-step form, a data table with filters, a calendar picker). Spend 10 minutes daily analyzing 2-3 examples from popular apps. How do they handle states, feedback, and accessibility? Sketch out improvements."
      }
    ]
  },
  {
    "number": 3,
    "title": "Crafting Compelling Portfolio Case Studies",
    "duration": "Week 5-6 (10-14 days)",
    "objective": "Learn to articulate your design process, decisions, and impact through compelling case studies that showcase your problem-solving abilities and strategic thinking. This is critical for career progression.",
    "resources": [
      {
        "type": "YouTube",
        "name": "How To Write A Great UX Case Study",
        "link": "https://www.youtube.com/watch?v=wX-y59J-gQ8",
        "description": "This video offers practical advice and a structured approach to writing impactful UX case studies, which are your primary tool for impressing hiring managers and securing better roles.",
        "meta": "~16 minutes (watch once, then re-watch specific sections daily for deeper understanding)"
      },
      {
        "type": "Article/Tutorial",
        "name": "The Ultimate Guide to Creating a UX Portfolio",
        "link": "https://www.careerfoundry.com/en/blog/ux-design/how-to-create-a-ux-portfolio-guide/",
        "description": "While you prefer audio-visual, this article complements the video by offering detailed examples and sections to include in a strong portfolio, useful for a slow learner to absorb at their own pace.",
        "meta": "CareerFoundry Blog"
      },
      {
        "type": "Practice",
        "name": "Case Study Outline & Storytelling",
        "description": "Select one of your existing projects. Over several days, dedicate your 20 minutes to outlining its case study. Focus on the problem, your process, your unique contributions, the challenges, and the impact of your design. Start drafting compelling headlines for each section."
      }
    ]
  }
];
