/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('role_permissions', function(table) {
    table.increments('id').primary();
    table.string('permission_key', 100).notNullable().unique();
    table.string('permission_name', 200).notNullable();
    table.string('description', 500);
    table.boolean('role_0_access').defaultTo(true).comment('Admin role (0) access');
    table.boolean('role_1_access').defaultTo(false).comment('Volunteer role (1) access');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    
    table.index('permission_key');
  }).then(() => {
    // Insert default permission for user management
    return knex('role_permissions').insert({
      permission_key: 'user_management',
      permission_name: 'User Management',
      description: 'Access to view and manage users list',
      role_0_access: true,  // Admin has access by default
      role_1_access: false  // Volunteer doesn't have access by default
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('role_permissions');
};

