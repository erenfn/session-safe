/**
 * Docker error handling helper functions
 */

/**
 * Check if the error indicates the container is already being removed
 */
export function isContainerAlreadyRemoving(err: any): boolean {
  return (
    err.statusCode === 409 &&
    err.json?.message?.includes('removal of container') &&
    err.json?.message?.includes('is already in progress')
  );
}

/**
 * Check if the error indicates the container is already stopped
 */
export function isContainerAlreadyStopped(err: any): boolean {
  return (
    err.statusCode === 304 &&
    err.reason?.includes('container already stopped')
  );
}

/**
 * Check if the error indicates the container is not found
 */
export function isContainerNotFound(err: any): boolean {
  return err.statusCode === 404;
}

/**
 * Check if the error indicates the container is already running
 */
export function isContainerAlreadyRunning(err: any): boolean {
  return (
    err.statusCode === 304 &&
    err.reason?.includes('container already started')
  );
} 