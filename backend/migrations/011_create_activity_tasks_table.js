/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('activity_tasks', function(table) {
    table.increments('id').primary();
    table.integer('activity_id').unsigned().notNullable();
    table.string('title', 255).notNullable();
    table.text('description');
    table.date('start_date');
    table.date('due_date');
    table.integer('total_hours').unsigned();
    table.enum('status', ['pending', 'in-progress', 'completed']).defaultTo('pending');
    table.boolean('completed').defaultTo(false);
    table.integer('created_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.foreign('activity_id').references('id').inTable('activities').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('users').onDelete('CASCADE');
    table.index(['activity_id']);
    table.index(['created_by']);
    table.index(['status']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('activity_tasks');
};

