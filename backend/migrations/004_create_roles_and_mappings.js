/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('roles', function(table) {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique();
    table.string('description', 500);
    table.boolean('is_system_role').defaultTo(false).comment('System roles (0=admin, 1=volunteer) cannot be deleted');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    
    table.index('name');
    table.index('is_system_role');
  }).then(() => {
    // Insert system roles
    return knex('roles').insert([
      {
        id: 0,
        name: 'Admin',
        description: 'System administrator with full access',
        is_system_role: true,
        is_active: true
      },
      {
        id: 1,
        name: 'Volunteer',
        description: 'Standard volunteer role',
        is_system_role: true,
        is_active: true
      }
    ]).catch(() => {
      // Ignore if roles already exist
    });
  }).then(() => {
    // Create role_permission_mappings table
    return knex.schema.createTable('role_permission_mappings', function(table) {
      table.increments('id').primary();
      table.integer('role_id').notNullable();
      table.string('permission_key', 100).notNullable();
      table.boolean('has_access').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      
      table.unique(['role_id', 'permission_key']);
      table.index('role_id');
      table.index('permission_key');
      
      // Foreign key constraints (optional, can be added if needed)
      // table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
      // table.foreign('permission_key').references('permission_key').inTable('role_permissions').onDelete('CASCADE');
    });
  }).then(() => {
    // Migrate existing role_permissions data to role_permission_mappings
    return knex.raw(`
      INSERT INTO role_permission_mappings (role_id, permission_key, has_access)
      SELECT 0, permission_key, role_0_access
      FROM role_permissions
      WHERE role_0_access = TRUE
      ON DUPLICATE KEY UPDATE has_access = has_access
    `).catch(() => {
      // Ignore if migration already done
    });
  }).then(() => {
    return knex.raw(`
      INSERT INTO role_permission_mappings (role_id, permission_key, has_access)
      SELECT 1, permission_key, role_1_access
      FROM role_permissions
      WHERE role_1_access = TRUE
      ON DUPLICATE KEY UPDATE has_access = has_access
    `).catch(() => {
      // Ignore if migration already done
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('role_permission_mappings')
    .then(() => knex.schema.dropTableIfExists('roles'));
};

