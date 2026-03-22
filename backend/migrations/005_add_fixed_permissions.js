/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('role_permissions', function(table) {
    // Add is_fixed column to mark system permissions that cannot be deleted
    table.boolean('is_fixed').defaultTo(false).comment('Fixed permissions cannot be deleted from frontend');
  }).then(() => {
    // Mark existing user_management permission as fixed
    return knex('role_permissions')
      .where('permission_key', 'user_management')
      .update({ is_fixed: true });
  }).then(() => {
    // Insert fixed permissions if they don't exist
    const fixedPermissions = [
      {
        permission_key: 'user_management',
        permission_name: 'User Management',
        description: 'Access to view and manage users list',
        is_fixed: true
      },
      {
        permission_key: 'activity_management',
        permission_name: 'Activity Management',
        description: 'Access to create, edit, and delete activities',
        is_fixed: true
      },
      {
        permission_key: 'ai_chat',
        permission_name: 'AI Chat',
        description: 'Access to use AI chat feature',
        is_fixed: true
      }
    ];

    // Insert permissions, handling duplicates
    return Promise.all(
      fixedPermissions.map(async (perm) => {
        try {
          // Try to insert first
          await knex('role_permissions').insert(perm);
        } catch (error) {
          // If duplicate key error, update existing permission
          if (error.code === 'ER_DUP_ENTRY' || error.message.includes('Duplicate entry')) {
            await knex('role_permissions')
              .where('permission_key', perm.permission_key)
              .update({ 
                is_fixed: true,
                permission_name: perm.permission_name,
                description: perm.description
              });
          } else {
            throw error;
          }
        }
      })
    );
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('role_permissions', function(table) {
    table.dropColumn('is_fixed');
  });
};

