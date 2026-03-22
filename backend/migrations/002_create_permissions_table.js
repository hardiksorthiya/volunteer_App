/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('permissions', function(table) {
    table.increments('id').primary();
    table.string('path', 255).notNullable().unique();
    table.string('label', 200).notNullable();
    table.string('description', 500);
    table.string('icon_name', 100).defaultTo('SettingsIcon');
    table.boolean('volunteer_access').defaultTo(true);
    table.boolean('admin_only').defaultTo(false);
    table.integer('display_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    
    table.index('path');
    table.index('volunteer_access');
    table.index('admin_only');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('permissions');
};

