/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import type { PluginManifest, PluginPermission } from './types';

const VALID_PERMISSIONS: PluginPermission[] = [
  'project:read', 'project:write',
  'timeline:read', 'timeline:write',
  'clips:read', 'clips:write',
  'assets:read', 'assets:write',
  'effects:register', 'transitions:register', 'export:register',
  'ui:panels', 'ui:tabs', 'ui:tools', 'ui:context-menus', 'ui:settings', 'ui:header',
  'renderer:read', 'juicer:read',
  'storage:project', 'storage:global',
];

export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
}

export const validateManifest = (manifest: Partial<PluginManifest>): ManifestValidationResult => {
  const errors: string[] = [];

  if (!manifest.id || typeof manifest.id !== 'string') {
    errors.push('manifest.id is required and must be a string');
  } else if (!/^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/.test(manifest.id)) {
    errors.push('manifest.id must contain only lowercase letters, numbers, dots, hyphens, and underscores');
  }

  if (!manifest.name || typeof manifest.name !== 'string') {
    errors.push('manifest.name is required and must be a string');
  }

  if (!manifest.version || typeof manifest.version !== 'string') {
    errors.push('manifest.version is required and must be a string');
  } else if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
    errors.push('manifest.version must follow semantic versioning (e.g. "1.0.0")');
  }

  if (!manifest.description || typeof manifest.description !== 'string') {
    errors.push('manifest.description is required and must be a string');
  }

  if (!manifest.author || typeof manifest.author !== 'string') {
    errors.push('manifest.author is required and must be a string');
  }

  if (!manifest.entry || typeof manifest.entry !== 'string') {
    errors.push('manifest.entry is required and must be a string');
  }

  if (!Array.isArray(manifest.permissions)) {
    errors.push('manifest.permissions must be an array');
  } else {
    for (const perm of manifest.permissions) {
      if (!VALID_PERMISSIONS.includes(perm)) {
        errors.push(`Invalid permission: "${perm}". Valid permissions: ${VALID_PERMISSIONS.join(', ')}`);
      }
    }
  }

  if (manifest.minApiVersion !== undefined && (typeof manifest.minApiVersion !== 'number' || manifest.minApiVersion < 1)) {
    errors.push('manifest.minApiVersion must be a positive integer');
  }

  return { valid: errors.length === 0, errors };
};
