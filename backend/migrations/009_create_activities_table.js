/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('activities', function(table) {
    table.increments('id').primary();
    table.string('title', 255).notNullable();
    table.text('description');
    table.string('location', 255);
    table.dateTime('start_date').notNullable();
    table.dateTime('end_date');
    table.integer('created_by').unsigned().notNullable();
    table.boolean('is_public').defaultTo(true); // true = admin-created (joinable), false = volunteer-created (private)
    table.boolean('is_active').defaultTo(true);
    table.integer('max_participants').unsigned();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.foreign('created_by').references('id').inTable('users').onDelete('CASCADE');
    table.index(['created_by']);
    table.index(['is_public']);
    table.index(['is_active']);
    table.index(['start_date']);
  }).then(function() {
    // Create activity_participants table for tracking who joined activities
    return knex.schema.createTable('activity_participants', function(table) {
      table.increments('id').primary();
      table.integer('activity_id').unsigned().notNullable();
      table.integer('user_id').unsigned().notNullable();
      table.timestamp('joined_at').defaultTo(knex.fn.now());
      table.string('status', 50).defaultTo('registered'); // registered, confirmed, cancelled
      
      table.foreign('activity_id').references('id').inTable('activities').onDelete('CASCADE');
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.unique(['activity_id', 'user_id']); // Prevent duplicate joins
      table.index(['activity_id']);
      table.index(['user_id']);
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('activity_participants')
    .then(function() {
      return knex.schema.dropTableIfExists('activities');
    });
};

