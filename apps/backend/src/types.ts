/**
 * Type definitions for the application
 */

/**
 * Environment interface for Cloudflare worker
 */
export interface Env {
  /**
   * D1 database binding
   */
  DB: D1Database;
} 