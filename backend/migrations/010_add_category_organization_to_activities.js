/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('activities', function(table) {
    table.string('category', 100).nullable().after('description');
    table.string('organization_name', 255).nullable().after('category');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('activities', function(table) {
    table.dropColumn('category');
    table.dropColumn('organization_name');
  });
};

