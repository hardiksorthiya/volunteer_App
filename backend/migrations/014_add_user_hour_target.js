/**
 * Add hour target columns to users for weekly/monthly volunteer hour goals
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.enum('hour_target_type', ['weekly', 'monthly']).nullable().defaultTo(null);
    table.integer('hour_target_hours').unsigned().nullable().defaultTo(null);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropColumn('hour_target_type');
    table.dropColumn('hour_target_hours');
  });
};
