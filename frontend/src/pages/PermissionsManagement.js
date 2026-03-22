import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import PageHeader from '../components/PageHeader';
import '../css/PermissionsManagement.css';

const PermissionsManagement = () => {
	const navigate = useNavigate();
	const [permissions, setPermissions] = useState([]);
	const [roles, setRoles] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [editingPermission, setEditingPermission] = useState(null);

	useEffect(() => {
		const token = localStorage.getItem('token');
		if (!token) {
			navigate('/login');
			return;
		}

		// Check if user is admin
		const user = JSON.parse(localStorage.getItem('user') || '{}');
		if (user.role !== 0 && user.user_type !== 'admin') {
			navigate('/dashboard');
			return;
		}

		fetchRoles();
		fetchPermissions();
	}, [navigate]);

	const fetchRoles = async () => {
		try {
			const response = await api.get('/roles');
			if (response.data.success) {
				setRoles(response.data.data || []);
			}
		} catch (err) {
			console.error('Error fetching roles:', err);
		}
	};

	const fetchPermissions = async () => {
		setLoading(true);
		setError('');

		try {
			const response = await api.get('/permissions');
			
			if (response.data.success) {
				setPermissions(response.data.data || []);
				if (response.data.data && response.data.data.length === 0) {
					setError('No permissions found. The permissions table may be empty. Please run the database migration if you haven\'t already.');
				}
			} else {
				setError(response.data.message || 'Failed to fetch permissions');
			}
		} catch (err) {
			console.error('Error fetching permissions:', err);
			let errorMessage = err.response?.data?.message || err.message || 'Failed to load permissions';
			
			// Handle 404 specifically
			if (err.response?.status === 404) {
				errorMessage = 'Permissions API endpoint not found. Please ensure the backend server is running and the routes are registered.';
			} else if (err.response?.status === 403) {
				errorMessage = 'Access denied. You need admin privileges to view this page.';
			} else if (errorMessage.includes('table not found') || errorMessage.includes('migration')) {
				errorMessage = 'Permissions table not found. Please run the database migration:\n\ncd backend\nnpx knex migrate:latest';
			}
			
			setError(errorMessage);
			
			if (err.response?.status === 401) {
				localStorage.removeItem('token');
				localStorage.removeItem('user');
				navigate('/login');
			}
		} finally {
			setLoading(false);
		}
	};

	const handleToggleAccess = async (permission, roleField) => {
		setError('');
		setSuccess('');

		const newValue = !permission[roleField];
		const updateData = {
			[roleField]: newValue
		};

		try {
			const response = await api.put(`/permissions/${permission.permission_key}`, updateData);

			if (response.data.success) {
				setSuccess('Permission updated successfully!');
				// Update local state
				setPermissions(permissions.map(p => 
					p.id === permission.id 
						? { ...p, [roleField]: newValue }
						: p
				));
				setTimeout(() => setSuccess(''), 3000);
			}
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to update permission');
			setTimeout(() => setError(''), 5000);
		}
	};

	const getRoleName = (roleId) => {
		const role = roles.find(r => r.id === roleId);
		if (role) return role.name;
		// Fallback for legacy roles
		return roleId === 0 ? 'Admin' : roleId === 1 ? 'Volunteer' : 'Unknown';
	};

	if (loading) {
		return (
			<div className="permissions-container">
				<div className="loading">Loading permissions...</div>
			</div>
		);
	}

	return (
		<div className="permissions-container">
			<div className="permissions-card">
				<PageHeader 
					title="Permissions Management"
					subtitle="Manage system permissions and access controls"
				/>

				{error && (
					<div className="error-message" style={{ whiteSpace: 'pre-line' }}>
						<strong>Error:</strong> {error}
					</div>
				)}
				{success && <div className="success-message">{success}</div>}

				<div className="permissions-table-wrapper">
					<table className="permissions-table">
						<thead>
							<tr>
								<th>Permission</th>
								<th>Description</th>
								<th>Admin Access</th>
								<th>Volunteer Access</th>
							</tr>
						</thead>

						<tbody>
							{permissions.length === 0 ? (
								<tr>
									<td colSpan="4" className="no-data">
										<div className="no-data-text">No permissions found</div>
									</td>
								</tr>
							) : (
								permissions.map((permission) => (
									<tr key={permission.id}>
										<td>
											<div className="permission-name-cell">
												<span className="permission-name">{permission.permission_name}</span>
												<span className="permission-key">{permission.permission_key}</span>
											</div>
										</td>
										<td>
											<div className="permission-description">
												{permission.description || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No description</span>}
											</div>
										</td>
										<td>
											<div className="toggle-container">
												<label className="toggle-switch">
													<input
														type="checkbox"
														checked={permission.role_0_access === true || permission.role_0_access === 1}
														onChange={() => handleToggleAccess(permission, 'role_0_access')}
													/>
													<span className="toggle-slider"></span>
												</label>
												<span className={`toggle-label ${permission.role_0_access ? 'enabled' : 'disabled'}`}>
													{permission.role_0_access ? '✓ Enabled' : '✗ Disabled'}
												</span>
												<span className="role-badge admin">Admin</span>
											</div>
										</td>
										<td>
											<div className="toggle-container">
												<label className="toggle-switch">
													<input
														type="checkbox"
														checked={permission.role_1_access === true || permission.role_1_access === 1}
														onChange={() => handleToggleAccess(permission, 'role_1_access')}
													/>
													<span className="toggle-slider"></span>
												</label>
												<span className={`toggle-label ${permission.role_1_access ? 'enabled' : 'disabled'}`}>
													{permission.role_1_access ? '✓ Enabled' : '✗ Disabled'}
												</span>
												<span className="role-badge volunteer">Volunteer</span>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};

export default PermissionsManagement;

