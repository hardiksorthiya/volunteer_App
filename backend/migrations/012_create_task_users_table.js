/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('task_users', function(table) {
    table.increments('id').primary();
    table.integer('task_id').unsigned().notNullable();
    table.integer('user_id').unsigned().notNullable();
    table.string('status', 50).defaultTo('assigned'); // assigned, in-progress, completed, cancelled
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.foreign('task_id').references('id').inTable('activity_tasks').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.unique(['task_id', 'user_id']); // Prevent duplicate assignments
    table.index(['task_id']);
    table.index(['user_id']);
    table.index(['status']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('task_users');
};

