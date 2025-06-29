import { Session, SessionStatus } from '../models';
import Docker from 'dockerode';

const docker = new Docker();
const SESSION_TIMEOUT_MINUTES = 10;

export async function cleanupExpiredSessions() {
  const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MINUTES * 60 * 1000);
  const expiredSessions = await Session.findAll({
    where: {
      status: [SessionStatus.PENDING, SessionStatus.ACTIVE],
      createdAt: { $lt: cutoff },
    },
  });
  for (const session of expiredSessions) {
    if (session.containerId) {
      try {
        const container = docker.getContainer(session.containerId);
        await container.stop({ t: 5 });
        await container.remove({ force: true });
      } catch (e: any) {
        // Handle case where container is already being removed
        if (e.statusCode === 409 && e.json?.message?.includes('removal of container') && e.json?.message?.includes('is already in progress')) {
          console.log(`[CLEANUP] Container ${session.containerId} already being removed, skipping cleanup`);
        } else {
          console.error(`[CLEANUP] Error cleaning up container ${session.containerId}:`, e);
        }
      }
    }
    session.status = SessionStatus.DESTROYED;
    await session.save();
  }
}

export function startSessionCleanupJob() {
  setInterval(cleanupExpiredSessions, 60 * 1000); // Run every minute
} 