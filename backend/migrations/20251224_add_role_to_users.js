exports.up = async function(knex) {
  const has = await knex.schema.hasColumn('users', 'role');
  if (!has) {
    await knex.schema.alterTable('users', (table) => {
      table.integer('role').defaultTo(1); // 0 = admin, 1 = volunteer
    });
  } else {
    // try to ensure default for existing column
    try {
      // MySQL/Postgres variations; best-effort
      await knex.raw("ALTER TABLE ?? ALTER COLUMN ?? SET DEFAULT ?", ['users', 'role', 1]);
    } catch (e) {
      try {
        await knex.raw("ALTER TABLE ?? MODIFY ?? INT DEFAULT ?", ['users', 'role', 1]);
      } catch (_) {
        // ignore if DB doesn't support these commands
      }
    }
  }

  // Backfill existing rows: if role is NULL set to 1; if role is empty string or non-numeric map user_type
  await knex('users').whereNull('role').update({ role: 1 });

  // For rows where role is non-numeric or empty, map by user_type
  await knex.raw(`
    UPDATE users
    SET role = CASE
      WHEN role IS NULL THEN 1
      WHEN role = '' THEN 1
      WHEN user_type = 'admin' THEN 0
      WHEN user_type = 'volunteer' THEN 1
      ELSE 1
    END
  `);
};

exports.down = async function(knex) {
  const has = await knex.schema.hasColumn('users', 'role');
  if (has) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('role');
    });
  }
};

