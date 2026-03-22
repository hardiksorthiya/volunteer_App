/**
 * Store a history of hour targets set by users.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('user_hour_targets', function (table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.enum('target_type', ['weekly', 'monthly']).notNullable();
    table.integer('target_hours').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.index(['user_id']);
    table.index(['created_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('user_hour_targets');
};

