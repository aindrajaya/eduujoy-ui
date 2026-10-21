// Presentation-only view models for the ported screens. U1 maps API types onto these.

export interface ModuleResource {
  type: string;
  name: string;
  link?: string;
  description: string;
  meta?: string;
}

export interface PathModule {
  number: number;
  title: string;
  duration: string;
  objective: string;
  resources: ModuleResource[];
}

export interface ActionPlan {
  quickStart: string;
  dailyRoutine: string;
  progressTracking: string;
}
