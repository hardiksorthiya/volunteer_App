import React, { useState, useEffect } from 'react';
import api from '../config/api';
import './css/RoleEditModal.css';

const RoleEditModal = ({ user, isOpen, onClose, onUpdate }) => {
  const [selectedRole, setSelectedRole] = useState(user?.role || 1);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch roles from backend
  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen, user]);

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const response = await api.get('/roles');
      if (response.data.success) {
        // Filter only active roles
        const activeRoles = (response.data.data || []).filter(role => role.is_active);
        setRoles(activeRoles);
        // Set selected role to user's current role if it exists in roles, otherwise first role
        if (activeRoles.length > 0) {
          const userRoleExists = activeRoles.find(r => r.id === user?.role);
          setSelectedRole(userRoleExists ? user.role : activeRoles[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError('Failed to load roles');
    } finally {
      setLoadingRoles(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.put(`/users/${user.id}/role`, {
        role: parseInt(selectedRole)
      });

      if (response.data.success) {
        setSuccess('Role updated successfully!');
        setTimeout(() => {
          onUpdate();
          onClose();
        }, 1000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  // Get role name by ID
  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Unknown';
  };

  // Get selected role object
  const selectedRoleObj = roles.find(r => r.id === parseInt(selectedRole));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit User Role</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="user-info">
            <p><strong>User:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Current Role:</strong> {getRoleName(user.role) || 'Not assigned'}</p>
          </div>

          {loadingRoles ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>Loading roles...</div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="role">Select Role:</label>
                <select
                  id="role"
                  value={selectedRole || ''}
                  onChange={(e) => setSelectedRole(parseInt(e.target.value))}
                  className="role-select"
                  disabled={roles.length === 0}
                >
                  {roles.length === 0 ? (
                    <option value="">No roles available</option>
                  ) : (
                    roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} {role.is_system_role && '(System)'}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {selectedRoleObj && selectedRoleObj.description && (
                <div className="permissions-preview">
                  <h3>Role Description:</h3>
                  <p style={{ color: '#6b7280', marginTop: '8px' }}>{selectedRoleObj.description}</p>
                </div>
              )}

              {selectedRoleObj && selectedRoleObj.permissions && selectedRoleObj.permissions.length > 0 && (
                <div className="permissions-preview">
                  <h3>Permissions ({selectedRoleObj.permissions.filter(p => p.has_access).length} granted):</h3>
                  <ul className="permissions-list">
                    {selectedRoleObj.permissions
                      .filter(p => p.has_access)
                      .map((perm, index) => (
                        <li key={index}>{perm.permission_name || perm.permission_key}</li>
                      ))}
                  </ul>
                </div>
              )}

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <div className="modal-actions">
                <button type="button" onClick={onClose} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={loading || selectedRole == user.role}>
                  {loading ? 'Updating...' : 'Update Role'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleEditModal;

