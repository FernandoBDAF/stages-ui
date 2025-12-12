/**
 * Database Architecture Constants
 * 
 * This module defines the database routing logic for the Knowledge Manager system.
 * Some collections are "constant" - they don't change per pipeline and should
 * live in a central database (system_data) rather than being duplicated across
 * pipeline-specific databases.
 * 
 * Benefits:
 * - Single source of truth for raw_videos (no duplication)
 * - Centralized observability data for cross-pipeline analysis
 * - Reduced storage costs and maintenance overhead
 */

/**
 * System database name for constant collections.
 * This database holds collections that are shared across all pipelines.
 */
export const SYSTEM_DATABASE = 'system_data';

/**
 * Collections that belong in the constant (system) database.
 * These are shared across all pipelines and should not be duplicated.
 */
export const CONSTANT_COLLECTIONS = new Set([
  'raw_videos',                // Source data - read by all pipelines
  'pipeline_input_filters',    // Saved filter definitions
  'transformation_logs',       // Pipeline transformation logs
  'pipeline_executions',       // Execution history
  'stage_metrics',             // Stage performance metrics
  'entity_resolution_log',     // Entity resolution audit trail
  'quality_metrics',           // Quality metrics from all runs
  'graphrag_runs',             // Run metadata
]);

/**
 * Determine which database a collection belongs to.
 * 
 * Constant collections (raw_videos, observability data) are routed to the
 * system database. All other collections use the pipeline-specific database.
 * 
 * @param collectionName - Name of the collection
 * @param pipelineDatabase - Current pipeline database name
 * @returns Database name to use (either SYSTEM_DATABASE or pipelineDatabase)
 * 
 * @example
 * getDatabaseForCollection('raw_videos', 'mongo_hack') // returns 'system_data'
 * getDatabaseForCollection('cleaned_transcripts', 'mongo_hack') // returns 'mongo_hack'
 */
export function getDatabaseForCollection(
  collectionName: string,
  pipelineDatabase: string
): string {
  if (CONSTANT_COLLECTIONS.has(collectionName)) {
    return SYSTEM_DATABASE;
  }
  return pipelineDatabase;
}

/**
 * Check if a collection is a constant collection (stored in system_data).
 * 
 * @param collectionName - Name of the collection to check
 * @returns True if the collection is stored in the system database
 */
export function isConstantCollection(collectionName: string): boolean {
  return CONSTANT_COLLECTIONS.has(collectionName);
}

