/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('chat_conversations', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('title', 255).defaultTo('New Conversation');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.index(['user_id']);
    table.index(['updated_at']);
  }).then(function() {
    // Create chat_messages table for storing individual messages
    return knex.schema.createTable('chat_messages', function(table) {
      table.increments('id').primary();
      table.integer('conversation_id').unsigned().notNullable();
      table.enum('role', ['user', 'assistant', 'system']).notNullable();
      table.text('content').notNullable();
      table.json('metadata').nullable(); // Store additional data like tokens, model used, etc.
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.foreign('conversation_id').references('id').inTable('chat_conversations').onDelete('CASCADE');
      table.index(['conversation_id']);
      table.index(['created_at']);
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('chat_messages')
    .then(function() {
      return knex.schema.dropTableIfExists('chat_conversations');
    });
};

