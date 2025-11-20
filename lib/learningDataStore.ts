/**
 * Learning Data Store with Prisma + Neon PostgreSQL
 * Stores learning plan data in database with automatic expiration
 */

import { prisma } from './prisma';

const CACHE_EXPIRATION = 30 * 60 * 1000; // 30 minutes

interface StoredData {
  data: any;
  timestamp: number;
}

/**
 * Store learning data in Neon PostgreSQL
 */
export async function storeLearningData(dataId: string, data: any, userId?: string): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + CACHE_EXPIRATION);
    
    // Upsert: update if exists, create if not
    const result = await prisma.learningData.upsert({
      where: { email: dataId },
      update: {
        profileSummary: data.profile_summary,
        learningPath: data.learning_path,
        actionPlan: data.action_plan,
        proTips: data.pro_tips,
        expectedTimeline: data.expected_timeline,
        expiresAt: expiresAt,
        updatedAt: new Date(),
      },
      create: {
        email: dataId,
        userId: userId,
        profileSummary: data.profile_summary,
        learningPath: data.learning_path,
        actionPlan: data.action_plan,
        proTips: data.pro_tips,
        expectedTimeline: data.expected_timeline,
        expiresAt: expiresAt,
      },
    });

    console.log(`✅ Learning data stored in Neon DB for: ${dataId}`);
    console.log(`📊 Modules: ${data.learning_path?.length || 0}`);
  } catch (error) {
    console.error('❌ Failed to store data in Neon DB:', error);
    throw error;
  }
}

/**
 * Retrieve learning data from Neon PostgreSQL
 */
export async function getLearningData(dataId: string): Promise<any | null> {
  try {
    const record = await prisma.learningData.findUnique({
      where: { email: dataId },
    });

    if (!record) {
      console.log(`❌ Data not found in DB: ${dataId}`);
      return null;
    }

    // Check if expired
    if (record.expiresAt && new Date() > record.expiresAt) {
      console.log(`⏰ Data expired in DB: ${dataId}`);
      await deleteLearningData(dataId);
      return null;
    }

    // Reconstruct the data object
    const data = {
      email: record.email,
      profile_summary: record.profileSummary,
      learning_path: record.learningPath,
      action_plan: record.actionPlan,
      pro_tips: record.proTips,
      expected_timeline: record.expectedTimeline,
    };

    console.log(`✅ Retrieved learning data from DB: ${dataId}`);
    return data;
  } catch (error) {
    console.error('❌ Failed to retrieve data from DB:', error);
    return null;
  }
}

/**
 * Delete learning data from Neon PostgreSQL
 */
export async function deleteLearningData(dataId: string): Promise<void> {
  try {
    await prisma.learningData.delete({
      where: { email: dataId },
    });
    console.log(`🗑️  Learning data deleted from DB: ${dataId}`);
  } catch (error) {
    console.warn('Data not found or already deleted:', error);
  }
}

/**
 * Clean up expired records (can be called by a cron job)
 */
export async function cleanupExpiredData(): Promise<number> {
  try {
    const result = await prisma.learningData.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    console.log(`🧹 Cleaned up ${result.count} expired records`);
    return result.count;
  } catch (error) {
    console.error('❌ Failed to cleanup expired data:', error);
    return 0;
  }
}

/**
 * Legacy functions for backwards compatibility
 */
export async function storeDataWithFallback(dataId: string, data: any): Promise<void> {
  return storeLearningData(dataId, data);
}

export async function getDataWithFallback(dataId: string): Promise<any | null> {
  return getLearningData(dataId);
}

export async function deleteDataWithFallback(dataId: string): Promise<void> {
  return deleteLearningData(dataId);
}
