export interface TimerSettings {
    workDuration: number; // in minutes
    shortBreakDuration: number; // in minutes
    longBreakDuration: number; // in minutes
    sessionCount: number; // number of sessions before a long break
}

export interface StepData {
    steps: number;
    caloriesBurned: number;
    distanceTraveled: number; // in kilometers
}

export interface MeditationSession {
    duration: number; // in minutes
    isActive: boolean;
    startTime?: Date;
    endTime?: Date;
}