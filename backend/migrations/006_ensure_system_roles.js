/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.hasTable('roles').then((exists) => {
    if (!exists) {
      console.log('Roles table does not exist. Please run migration 004 first.');
      return;
    }
    
    // Use raw SQL to ensure Admin and Volunteer roles exist
    // This approach works better with MySQL auto-increment
    return knex.raw(`
      -- Ensure Admin role (id: 0) exists
      INSERT INTO roles (id, name, description, is_system_role, is_active, created_at, updated_at)
      VALUES (0, 'Admin', 'System administrator with full access', TRUE, TRUE, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        name = 'Admin',
        description = 'System administrator with full access',
        is_system_role = TRUE,
        is_active = TRUE,
        updated_at = NOW()
    `).then(() => {
      // Ensure Volunteer role (id: 1) exists
      return knex.raw(`
        INSERT INTO roles (id, name, description, is_system_role, is_active, created_at, updated_at)
        VALUES (1, 'Volunteer', 'Standard volunteer role', TRUE, TRUE, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          name = 'Volunteer',
          description = 'Standard volunteer role',
          is_system_role = TRUE,
          is_active = TRUE,
          updated_at = NOW()
      `);
    }).catch((error) => {
      // If ON DUPLICATE KEY UPDATE doesn't work (some MySQL versions), try alternative approach
      console.log('Using alternative method to ensure system roles...');
      
      // Check and insert/update Admin role
      return knex('roles').where('id', 0).first().then((adminRole) => {
        if (!adminRole) {
          return knex.raw(`
            INSERT INTO roles (id, name, description, is_system_role, is_active, created_at, updated_at)
            VALUES (0, 'Admin', 'System administrator with full access', TRUE, TRUE, NOW(), NOW())
          `);
        } else {
          return knex('roles').where('id', 0).update({
            name: 'Admin',
            description: 'System administrator with full access',
            is_system_role: true,
            is_active: true
          });
        }
      }).then(() => {
        // Check and insert/update Volunteer role
        return knex('roles').where('id', 1).first().then((volunteerRole) => {
          if (!volunteerRole) {
            return knex.raw(`
              INSERT INTO roles (id, name, description, is_system_role, is_active, created_at, updated_at)
              VALUES (1, 'Volunteer', 'Standard volunteer role', TRUE, TRUE, NOW(), NOW())
            `);
          } else {
            return knex('roles').where('id', 1).update({
              name: 'Volunteer',
              description: 'Standard volunteer role',
              is_system_role: true,
              is_active: true
            });
          }
        });
      });
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Don't delete system roles in down migration
  // They should always exist
  return Promise.resolve();
};

