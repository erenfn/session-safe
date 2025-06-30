import Docker from 'dockerode';
import { isContainerAlreadyRemoving, isContainerAlreadyStopped } from '../utils/docker.helper';

const docker = new Docker();

export class DockerService {
  /**
   * Check if a Docker image exists
   */
  static async checkImageExists(imageName: string): Promise<boolean> {
    console.log(`[DOCKER] Checking if image exists: ${imageName}`);
    const images = await docker.listImages({ filters: { reference: [imageName] } });
    console.log(`[DOCKER] Found images: ${images.length}`);
    return images.length > 0;
  }

  /**
   * Create and start a browser session container
   */
  static async createBrowserSessionContainer(): Promise<{
    containerId: string;
    vncPort: string;
    novncPort: string;
  }> {
    console.log('[DOCKER] Creating browser session container...');
    
    const container = await docker.createContainer({
      Image: 'browser-session',
      Tty: true,
      ExposedPorts: {
        '5901/tcp': {},
        '6080/tcp': {},
      },
      Env: [
        `COOKIE_ENCRYPTION_KEY=${process.env.COOKIE_ENCRYPTION_KEY}`,
        `PYTHON_SCRIPT_SECRET=${process.env.PYTHON_SCRIPT_SECRET}`,
      ],
      HostConfig: {
        PortBindings: {
          '5901/tcp': [{ HostPort: '' }],
          '6080/tcp': [{ HostPort: '' }],
        },
        AutoRemove: true,
      },
    });
    console.log('[DOCKER] Container created with ID:', container.id);

    console.log('[DOCKER] Starting container...');
    await container.start();
    console.log('[DOCKER] Container started successfully');

    console.log('[DOCKER] Waiting for container to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('[DOCKER] Inspecting container for port mappings...');
    const data = await container.inspect();
    console.log('[DOCKER] Container inspection data:', JSON.stringify(data.NetworkSettings.Ports, null, 2));
    
    const vncPortBinding = data.NetworkSettings.Ports['5901/tcp'];
    const novncPortBinding = data.NetworkSettings.Ports['6080/tcp'];
    
    if (!vncPortBinding?.[0] || !novncPortBinding?.[0]) {
      console.error('[DOCKER] Port mappings not found:', { vncPortBinding, novncPortBinding });
      throw new Error('Container created but port mappings failed - VNC or noVNC ports not properly assigned');
    }
    
    const vncPort = vncPortBinding[0].HostPort;
    const novncPort = novncPortBinding[0].HostPort;
    console.log('[DOCKER] Port mappings - VNC:', vncPort, 'noVNC:', novncPort);

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
    console.log(`[DOCKER] Terminating container: ${containerId}`);
    const container = docker.getContainer(containerId);
    
    try {
      await container.stop({ t: 5 });
      await container.remove({ force: true });
      console.log(`[DOCKER] Container ${containerId} terminated successfully`);
    } catch (e: any) {
      // Handle case where container is already being removed
      if (isContainerAlreadyRemoving(e)) {
        console.log(`[DOCKER] Container ${containerId} already being removed, skipping cleanup`);
      } 
      // Handle case where container is already stopped
      else if (isContainerAlreadyStopped(e)) {
        console.log(`[DOCKER] Container ${containerId} already stopped, proceeding with removal`);
        try {
          await container.remove({ force: true });
          console.log(`[DOCKER] Container ${containerId} removed successfully`);
        } catch (removeError: any) {
          console.error(`[DOCKER] Error removing already-stopped container ${containerId}:`, removeError);
        }
      } else {
        console.error(`[DOCKER] Error terminating container ${containerId}:`, e);
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
      console.error(`[DOCKER] Error getting container info for ${containerId}:`, e);
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
      console.error('[DOCKER] Error listing containers:', e);
      throw e;
    }
  }

  /**
   * Execute a command inside a container
   */
  static async execInContainer(containerId: string, command: string[]): Promise<void> {
    try {
      console.log(`[DOCKER] Executing command in container ${containerId}:`, command.join(' '));
      const container = docker.getContainer(containerId);
      
      // Create exec instance
      const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
      });
      
      // Start the exec and get stream
      const stream = await exec.start({});
      
      // Handle stream output
      await new Promise((resolve, reject) => {
        container.modem.demuxStream(stream, process.stdout, process.stderr);
        stream.on('end', () => {
          console.log(`[DOCKER] Command execution completed in container ${containerId}`);
          resolve(undefined);
        });
        stream.on('error', (error: any) => {
          console.error(`[DOCKER] Error executing command in container ${containerId}:`, error);
          reject(error);
        });
      });
    } catch (error) {
      console.error(`[DOCKER] Error executing command in container ${containerId}:`, error);
      throw error;
    }
  }
} 