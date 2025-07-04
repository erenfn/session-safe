import Docker from 'dockerode';
import { isContainerAlreadyRemoving, isContainerAlreadyStopped } from '../utils/docker.helper';
import { Logger } from '../utils/logger.helper';

const docker = new Docker();

export class DockerService {
  /**
   * Check if a Docker image exists
   */
  static async checkImageExists(imageName: string): Promise<boolean> {
    const images = await docker.listImages({ filters: { reference: [imageName] } });
    Logger.info(`[DOCKER] Found images: ${images.length}`);
    return images.length > 0;
  }

  /**
   * Create and start a browser session container
   */
  static async createBrowserSessionContainer(vncPassword: string): Promise<{
    containerId: string;
    vncPort: string;
    novncPort: string;
  }> {
    Logger.info('[DOCKER] Creating browser session container...');
    
    const container = await docker.createContainer({
      Image: 'browser-session',
      Tty: true,
      ExposedPorts: {
        '5901/tcp': {},
        '6080/tcp': {},
      },
      Env: [
        `COOKIE_ENCRYPTION_KEY=${process.env.COOKIE_ENCRYPTION_KEY}`,
        `VNC_PASSWORD=${vncPassword}`,
      ],
      HostConfig: {
        PortBindings: {
          '5901/tcp': [{ HostPort: '' }],
          '6080/tcp': [{ HostPort: '' }],
        },
        AutoRemove: true,
      },
    });
    Logger.info('[DOCKER] Container created with ID:', container.id);

    await container.start();
    Logger.info('[DOCKER] Container started successfully');

    await new Promise(resolve => setTimeout(resolve, 5000));

    const data = await container.inspect();
    const vncPortBinding = data.NetworkSettings.Ports['5901/tcp'];
    const novncPortBinding = data.NetworkSettings.Ports['6080/tcp'];
    
    if (!vncPortBinding?.[0] || !novncPortBinding?.[0]) {
      Logger.error('[DOCKER] Port mappings not found:', { vncPortBinding, novncPortBinding });
      throw new Error('Container created but port mappings failed - VNC or noVNC ports not properly assigned');
    }
    
    const vncPort = vncPortBinding[0].HostPort;
    const novncPort = novncPortBinding[0].HostPort;

    return {
      containerId: container.id,
      vncPort,
      novncPort,
    };
  }

  /**
   * Terminate a container (stop and remove)
   */
  static async terminateContainer(containerId: string): Promise<void> {
    Logger.info(`[DOCKER] Terminating container: ${containerId}`);
    const container = docker.getContainer(containerId);
    
    try {
      await container.stop({ t: 5 });
      await container.remove({ force: true });
      Logger.info(`[DOCKER] Container ${containerId} terminated successfully`);
    } catch (e: any) {
      // Handle case where container is already being removed
      if (isContainerAlreadyRemoving(e)) {
        Logger.info(`[DOCKER] Container ${containerId} already being removed, skipping cleanup`);
      } 
      // Handle case where container is already stopped
      else if (isContainerAlreadyStopped(e)) {
        Logger.info(`[DOCKER] Container ${containerId} already stopped, proceeding with removal`);
        try {
          await container.remove({ force: true });
          Logger.info(`[DOCKER] Container ${containerId} removed successfully`);
        } catch (removeError: any) {
          Logger.error(`[DOCKER] Error removing already-stopped container ${containerId}:`, removeError);
        }
      } else {
        Logger.error(`[DOCKER] Error terminating container ${containerId}:`, e);
        throw e;
      }
    }
  }

  /**
   * Get container information
   */
  static async getContainerInfo(containerId: string): Promise<any> {
    try {
      const container = docker.getContainer(containerId);
      return await container.inspect();
    } catch (e: any) {
      Logger.error(`[DOCKER] Error getting container info for ${containerId}:`, e);
      throw e;
    }
  }

  /**
   * List all containers
   */
  static async listContainers(): Promise<any[]> {
    try {
      return await docker.listContainers({ all: true });
    } catch (e: any) {
      Logger.error('[DOCKER] Error listing containers:', e);
      throw e;
    }
  }

  /**
   * Execute a command inside a container
   */
  static async execInContainer(
    containerId: string,
    command: string[],
    user?: string
  ): Promise<void> {
    try {
      Logger.info(`[DOCKER] Executing command in container ${containerId}:`, command.join(' '));
      const container = docker.getContainer(containerId);
      
      // Create exec instance
      const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
        User: user,
      });
      
      // Start the exec and get stream
      const stream = await exec.start({});
      
      // Handle stream output
      await new Promise((resolve, reject) => {
        container.modem.demuxStream(stream, process.stdout, process.stderr);
        stream.on('end', () => {
          Logger.info(`[DOCKER] Command execution completed in container ${containerId}`);
          resolve(undefined);
        });
        stream.on('error', (error: any) => {
          Logger.error(`[DOCKER] Error executing command in container ${containerId}:`, error);
          reject(error);
        });
      });
    } catch (error) {
      Logger.error(`[DOCKER] Error executing command in container ${containerId}:`, error);
      throw error;
    }
  }

  static async getContainerPorts(containerId: string): Promise<{ vncPort: string; novncPort: string }> {
    try {
      const container = docker.getContainer(containerId);
      const data = await container.inspect();
      
      const portBindings = data.NetworkSettings.Ports;
      
      const vncPort = portBindings['5901/tcp']?.[0]?.HostPort;
      const novncPort = portBindings['6080/tcp']?.[0]?.HostPort;

      if (!vncPort || !novncPort) {
        throw new Error('Could not find port mappings for container');
      }

      return { vncPort, novncPort };
    } catch (error: any) {
      Logger.error(`[DOCKER] Error inspecting container ${containerId}:`, error);
      if (error.statusCode === 404) {
        return { vncPort: '', novncPort: '' };
      }
      throw error;
    }
  }
} 