/**
 * Add date-range support for hour targets.
 * - Active target range stored on `users`:
 *    - hour_target_start_date (DATE)
 *    - hour_target_end_date (DATE)
 * - Target history stored on `user_hour_targets`:
 *    - start_date (DATE)
 *    - end_date (DATE)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return Promise.all([
    knex.schema.alterTable('users', function (table) {
      table.date('hour_target_start_date').nullable();
      table.date('hour_target_end_date').nullable();
    }),
    knex.schema.alterTable('user_hour_targets', function (table) {
      table.date('start_date').nullable();
      table.date('end_date').nullable();
    }),
  ]);
};

exports.down = function (knex) {
  return Promise.all([
    knex.schema.alterTable('users', function (table) {
      table.dropColumn('hour_target_start_date');
      table.dropColumn('hour_target_end_date');
    }),
    knex.schema.alterTable('user_hour_targets', function (table) {
      table.dropColumn('start_date');
      table.dropColumn('end_date');
    }),
  ]);
};

