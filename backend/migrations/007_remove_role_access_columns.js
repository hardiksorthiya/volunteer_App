/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.hasTable('role_permissions').then((exists) => {
    if (!exists) {
      console.log('role_permissions table does not exist. Skipping column removal.');
      return;
    }
    
    // Remove role_0_access and role_1_access columns
    // These are no longer needed since we use role_permission_mappings table
    return knex.schema.table('role_permissions', function(table) {
      table.dropColumn('role_0_access');
      table.dropColumn('role_1_access');
    }).catch((error) => {
      // If columns don't exist, that's fine - just continue
      if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY' || error.message.includes("doesn't exist")) {
        console.log('Columns role_0_access or role_1_access do not exist. Skipping.');
        return;
      }
      throw error;
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.hasTable('role_permissions').then((exists) => {
    if (!exists) {
      return;
    }
    
    // Add back the columns if rolling back
    return knex.schema.table('role_permissions', function(table) {
      table.boolean('role_0_access').defaultTo(true).comment('Admin role (0) access');
      table.boolean('role_1_access').defaultTo(false).comment('Volunteer role (1) access');
    });
  });
};

