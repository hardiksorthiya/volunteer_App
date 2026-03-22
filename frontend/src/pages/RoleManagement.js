import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';
import '../css/RoleManagement.css';

const RoleManagement = () => {
	const navigate = useNavigate();
	const [roles, setRoles] = useState([]);
	const [availablePermissions, setAvailablePermissions] = useState([]);
	const [allUsers, setAllUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingRole, setEditingRole] = useState(null);
	const [activeTab, setActiveTab] = useState('details'); // 'details' or 'users'
	const [formData, setFormData] = useState({
		name: '',
		description: '',
		permissions: []
	});

	useEffect(() => {
		const token = localStorage.getItem('token');
		if (!token) {
			navigate('/login');
			return;
		}

		const user = JSON.parse(localStorage.getItem('user') || '{}');
		if (user.role !== 0 && user.user_type !== 'admin') {
			navigate('/dashboard');
			return;
		}

		fetchRoles();
		fetchAvailablePermissions();
		fetchAllUsers();
	}, [navigate]);

	const fetchRoles = async () => {
		setLoading(true);
		setError('');

		try {
			const response = await api.get('/roles');
			
			if (response.data.success) {
				setRoles(response.data.data || []);
			} else {
				setError(response.data.message || 'Failed to fetch roles');
			}
		} catch (err) {
			console.error('Error fetching roles:', err);
			let errorMessage = err.response?.data?.message || err.message || 'Failed to load roles';
			
			// Handle 404 specifically
			if (err.response?.status === 404) {
				errorMessage = 'Roles API endpoint not found. Please ensure the backend server is running and the routes are registered.';
			} else if (err.response?.status === 403) {
				errorMessage = 'Access denied. You need admin privileges to view roles.';
			} else if (errorMessage.includes('table not found') || errorMessage.includes('migration')) {
				errorMessage = 'Roles table not found. Please run the database migration:\n\ncd backend\nnpx knex migrate:latest';
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

	const fetchAvailablePermissions = async () => {
		try {
			const response = await api.get('/permissions');
			if (response.data.success) {
				setAvailablePermissions(response.data.data || []);
			}
		} catch (err) {
			console.error('Error fetching permissions:', err);
		}
	};

	const fetchAllUsers = async () => {
		try {
			const response = await api.get('/users');
			if (response.data.success) {
				setAllUsers(response.data.data || []);
			}
		} catch (err) {
			console.error('Error fetching users:', err);
		}
	};

	const handleOpenModal = (role = null) => {
		if (role) {
			setEditingRole(role);
			setFormData({
				name: role.name,
				description: role.description || '',
				permissions: role.permissions || []
			});
		} else {
			setEditingRole(null);
			setFormData({
				name: '',
				description: '',
				permissions: []
			});
		}
		setActiveTab('details');
		setIsModalOpen(true);
		setError('');
		setSuccess('');
	};

	const handleCloseModal = () => {
		setIsModalOpen(false);
		setEditingRole(null);
		setActiveTab('details');
		setFormData({
			name: '',
			description: '',
			permissions: []
		});
	};

	const handleRemoveUserFromRole = async (userId) => {
		if (!editingRole) return;

		try {
			// Find default volunteer role (id: 1) or use the first available role
			const defaultRole = roles.find(r => r.id === 1) || roles.find(r => r.id !== editingRole.id);
			if (!defaultRole) {
				setError('Cannot remove user: No alternative role available');
				return;
			}

			const response = await api.put(`/users/${userId}/role`, {
				role: defaultRole.id
			});

			if (response.data.success) {
				setSuccess(`User removed from ${editingRole.name} role`);
				fetchAllUsers();
				fetchRoles();
				setTimeout(() => setSuccess(''), 2000);
			}
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to remove user from role');
		}
	};

	const handleAddUserToRole = async (userId) => {
		if (!editingRole) return;

		try {
			const response = await api.put(`/users/${userId}/role`, {
				role: editingRole.id
			});

			if (response.data.success) {
				setSuccess(`User added to ${editingRole.name} role`);
				fetchAllUsers();
				fetchRoles();
				setTimeout(() => setSuccess(''), 2000);
			}
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to add user to role');
		}
	};

	// Get users assigned to the current role
	const getUsersInRole = () => {
		if (!editingRole) return [];
		return allUsers.filter(user => Number(user.role) === Number(editingRole.id));
	};

	// Get users not in the current role
	const getUsersNotInRole = () => {
		if (!editingRole) return [];
		return allUsers.filter(user => Number(user.role) !== Number(editingRole.id));
	};

	const handlePermissionToggle = (permissionKey) => {
		setFormData(prev => {
			const existing = prev.permissions.find(p => p.permission_key === permissionKey);
			if (existing) {
				return {
					...prev,
					permissions: prev.permissions.map(p =>
						p.permission_key === permissionKey
							? { ...p, has_access: !p.has_access }
							: p
					)
				};
			} else {
				return {
					...prev,
					permissions: [
						...prev.permissions,
						{ permission_key: permissionKey, has_access: true }
					]
				};
			}
		});
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');

		if (!formData.name.trim()) {
			setError('Role name is required');
			return;
		}

		try {
			// Prepare permissions array - include all available permissions
			const permissions = availablePermissions.map(perm => {
				const existingPerm = formData.permissions.find(p => p.permission_key === perm.permission_key);
				const hasAccess = existingPerm ? (existingPerm.has_access === true || existingPerm.has_access === 1 || existingPerm.has_access === '1') : false;
				return {
					permission_key: perm.permission_key,
					has_access: hasAccess
				};
			});

			console.log('Saving permissions for role:', editingRole?.id || 'new', permissions);

			if (editingRole) {
				// Prepare update data
				const updateData = {
					description: formData.description,
					permissions: permissions
				};
				
				// Only include name if it's a custom role (not Admin id:0 or Volunteer id:1)
				// For Admin and Volunteer, don't send name to avoid validation errors
				if (editingRole.id !== 0 && editingRole.id !== 1) {
					updateData.name = formData.name;
				}
				
				// Update role
				const response = await api.put(`/roles/${editingRole.id}`, updateData);

				if (response.data.success) {
					setSuccess('Role updated successfully!');
					fetchRoles();
					
					// Trigger sidebar refresh to update menu items
					window.dispatchEvent(new Event('permissionsUpdated'));
					console.log('[ROLE MANAGEMENT] Dispatched permissionsUpdated event');
					
					setTimeout(() => {
						handleCloseModal();
					}, 1000);
				}
			} else {
				// Create role
				const response = await api.post('/roles', {
					name: formData.name,
					description: formData.description,
					permissions: permissions
				});

				if (response.data.success) {
					setSuccess('Role created successfully!');
					fetchRoles();
					
					// Trigger sidebar refresh to update menu items
					window.dispatchEvent(new Event('permissionsUpdated'));
					console.log('[ROLE MANAGEMENT] Dispatched permissionsUpdated event');
					
					setTimeout(() => {
						handleCloseModal();
					}, 1000);
				}
			}
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to save role');
		}
	};

	const handleDelete = async (role) => {
		if (!window.confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
			return;
		}

		try {
			const response = await api.delete(`/roles/${role.id}`);
			if (response.data.success) {
				setSuccess('Role deleted successfully!');
				fetchRoles();
			}
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to delete role');
		}
	};

	if (loading) {
		return (
			<div className="dashboard-content">
				<div className="container-fluid">
					<div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
						<div className="spinner-border text-primary" role="status">
							<span className="visually-hidden">Loading...</span>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="dashboard-content">
			<div className="container-fluid">
				{/* Page Header */}
				<div className="card shadow-sm border-0 mb-4" style={{ 
					background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
					borderRadius: '16px',
					padding: '1.5rem 2rem'
				}}>
					<div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
						<div>
							<h1 className="mb-1 fw-bold text-white" style={{ fontSize: '1.75rem' }}>Role Management</h1>
							<p className="text-white mb-0" style={{ opacity: 0.9 }}>Create and manage user roles and permissions</p>
						</div>
						<button
							onClick={() => handleOpenModal()}
							className="btn btn-light d-flex align-items-center gap-2"
							style={{ 
								padding: '0.625rem 1.25rem',
								borderRadius: '8px',
								fontWeight: '600',
								boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
							}}
						>
							<PlusIcon style={{ width: '18px', height: '18px' }} />
							<span>Create New Role</span>
						</button>
					</div>
				</div>

				{error && (
					<div className="alert alert-danger alert-dismissible fade show" role="alert" style={{ whiteSpace: 'pre-line' }}>
						<strong>Error:</strong> {error}
						<button type="button" className="btn-close" onClick={() => setError('')}></button>
					</div>
				)}
				{success && (
					<div className="alert alert-success alert-dismissible fade show" role="alert">
						{success}
						<button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
					</div>
				)}

				{/* Roles Table */}
				<div className="card shadow-sm border-0" style={{ borderRadius: '16px' }}>
					<div className="card-body p-0">
						<div className="table-responsive">
							<table className="table table-hover table-striped align-middle mb-0">
								<thead>
									<tr className="table-header-users">
										<th style={{ color: '#ffffff', fontWeight: '600', padding: '1rem', border: 'none' }}>Role Name</th>
										<th style={{ color: '#ffffff', fontWeight: '600', padding: '1rem', border: 'none' }}>Description</th>
										<th style={{ color: '#ffffff', fontWeight: '600', padding: '1rem', border: 'none' }}>Type</th>
										<th style={{ color: '#ffffff', fontWeight: '600', padding: '1rem', border: 'none' }}>Permissions</th>
										<th style={{ color: '#ffffff', fontWeight: '600', padding: '1rem', border: 'none', textAlign: 'center' }}>Actions</th>
									</tr>
								</thead>
								<tbody>
									{roles.length === 0 ? (
										<tr>
											<td colSpan="5" className="text-center py-5 text-muted">
												No roles found. Create your first role!
											</td>
										</tr>
									) : (
										roles.map((role) => (
											<tr key={role.id}>
												<td style={{ padding: '1rem' }}>
													<div className="fw-semibold" style={{ color: '#1e293b' }}>{role.name}</div>
												</td>
												<td style={{ padding: '1rem', color: '#475569' }}>
													{role.description || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No description</span>}
												</td>
												<td style={{ padding: '1rem' }}>
													<span className={`badge ${role.id === 0 || role.id === 1 ? 'bg-warning' : role.is_system_role ? 'bg-info' : 'bg-secondary'}`} style={{
														padding: '0.375rem 0.75rem',
														borderRadius: '6px',
														fontSize: '0.875rem',
														fontWeight: '600'
													}}>
														{role.id === 0 ? 'Admin Role' : 
														 role.id === 1 ? 'Volunteer Role' :
														 role.is_system_role ? 'System Role' : 'Custom Role'}
													</span>
												</td>
												<td style={{ padding: '1rem', color: '#475569' }}>
													<span className="fw-semibold" style={{ color: '#1e293b' }}>
														{role.permissions?.filter(p => p.has_access).length || 0}
													</span>
													<span style={{ color: '#94a3b8' }}> / {availablePermissions.length}</span>
												</td>
												<td style={{ padding: '1rem', textAlign: 'center' }}>
													<div className="d-flex align-items-center justify-content-center gap-2">
														<button
															onClick={() => handleOpenModal(role)}
															className="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-center"
															title={role.id === 0 ? 'Admin: Can edit description and permissions only' : role.id === 1 ? 'Volunteer: Can edit description and permissions only' : 'Edit role'}
															style={{
																width: '36px',
																height: '36px',
																padding: 0,
																borderRadius: '8px'
															}}
														>
															<EditIcon style={{ width: '16px', height: '16px' }} />
														</button>
														{role.id !== 0 && role.id !== 1 ? (
															<button
																onClick={() => handleDelete(role)}
																className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center"
																title="Delete custom role"
																style={{
																	width: '36px',
																	height: '36px',
																	padding: 0,
																	borderRadius: '8px'
																}}
															>
																<TrashIcon style={{ width: '16px', height: '16px' }} />
															</button>
														) : (
															<span className="badge bg-light text-muted" style={{
																fontSize: '0.75rem',
																padding: '0.25rem 0.5rem',
																borderRadius: '4px'
															}}>
																Protected
															</span>
														)}
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
			</div>

			{/* Create/Edit Modal */}
			{isModalOpen && (
				<div 
					className="roles-modal-overlay" 
					onClick={handleCloseModal}
				>
					<div 
						className="roles-modal-content" 
						onClick={(e) => e.stopPropagation()}
					>
						<div className="roles-modal-header">
							<h2>{editingRole ? 'Edit Role' : 'Create New Role'}</h2>
							<button
								onClick={handleCloseModal}
								className="roles-modal-close-btn"
							>
								×
							</button>
						</div>

						{/* Tabs */}
						{editingRole && (
							<div className="roles-modal-tabs">
								<button
									type="button"
									className={`roles-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
									onClick={() => setActiveTab('details')}
								>
									Details & Permissions
								</button>
								<button
									type="button"
									className={`roles-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
									onClick={() => setActiveTab('users')}
								>
									Users ({getUsersInRole().length})
								</button>
							</div>
						)}

						{activeTab === 'details' && (
						<form onSubmit={handleSubmit}>
							<div className="roles-form-group">
								<label htmlFor="role-name">
									Role Name *
								</label>
								<input
									id="role-name"
									type="text"
									value={formData.name}
									onChange={(e) => setFormData({ ...formData, name: e.target.value })}
									disabled={editingRole?.id === 0 || editingRole?.id === 1}
									placeholder="e.g., Manager, Editor, Viewer"
									required
								/>
								{(editingRole?.id === 0 || editingRole?.id === 1) && (
									<small style={{ color: '#6b7280', fontSize: '13px', marginTop: '6px', display: 'block' }}>
										{editingRole?.id === 0 ? 'Admin role cannot be renamed' : 'Volunteer role cannot be renamed'}
									</small>
								)}
							</div>

							<div className="roles-form-group">
								<label htmlFor="role-description">
									Description
								</label>
								<textarea
									id="role-description"
									value={formData.description}
									onChange={(e) => setFormData({ ...formData, description: e.target.value })}
									placeholder="Provide a brief description of this role's purpose and responsibilities..."
									rows={4}
								/>
							</div>

							<div className="roles-form-group">
								<label>
									Permissions
									<span style={{ 
										marginLeft: '8px', 
										fontSize: '13px', 
										fontWeight: '400', 
										color: '#6b7280' 
									}}>
										({formData.permissions.filter(p => p.has_access).length} of {availablePermissions.length} selected)
									</span>
								</label>
								{availablePermissions.length === 0 ? (
									<div style={{ 
										padding: '20px', 
										textAlign: 'center', 
										color: '#6b7280',
										background: '#f9fafb',
										borderRadius: '12px',
										border: '2px dashed #e5e7eb'
									}}>
										No permissions available. Please run database migration to add fixed permissions.
									</div>
								) : (
									<div className="permissions-list">
										{availablePermissions.map((perm) => {
											const hasAccess = formData.permissions.find(p => p.permission_key === perm.permission_key)?.has_access || false;
											return (
												<div
													key={perm.permission_key}
													className={`permission-item ${hasAccess ? 'permission-item-selected' : ''}`}
													onClick={() => handlePermissionToggle(perm.permission_key)}
												>
													<input
														type="checkbox"
														checked={hasAccess}
														onChange={() => handlePermissionToggle(perm.permission_key)}
														onClick={(e) => e.stopPropagation()}
													/>
													<div className="permission-item-info">
														<div className="permission-item-name">
															{perm.permission_name}
															{perm.is_fixed && (
																<span style={{ 
																	marginLeft: '8px', 
																	fontSize: '11px', 
																	color: '#6b7280',
																	fontStyle: 'italic'
																}}>
																	(System)
																</span>
															)}
														</div>
														<div className="permission-item-desc">
															{perm.description || perm.permission_key}
														</div>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>

							{error && (
								<div className="roles-error-message">
									{error}
								</div>
							)}
							{success && (
								<div className="roles-success-message">
									{success}
								</div>
							)}

							<div className="roles-modal-actions">
								<button
									type="button"
									onClick={handleCloseModal}
									className="cancel-btn"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="submit-btn"
								>
									{editingRole ? 'Update Role' : 'Create Role'}
								</button>
							</div>
						</form>
						)}

						{activeTab === 'users' && editingRole && (
							<div className="roles-users-tab">
								{error && (
									<div className="roles-error-message">
										{error}
									</div>
								)}
								{success && (
									<div className="roles-success-message">
										{success}
									</div>
								)}

								{/* Users in this role */}
								<div className="users-section">
									<h3>Users in this role ({getUsersInRole().length})</h3>
									{getUsersInRole().length === 0 ? (
										<div className="no-users-message">
											No users assigned to this role yet.
										</div>
									) : (
										<div className="users-list">
											{getUsersInRole().map((user) => (
												<div key={user.id} className="user-item">
													<div className="user-info">
														<div className="user-name">{user.name}</div>
														<div className="user-email">{user.email}</div>
														{user.phone && (
															<div className="user-phone">{user.phone}</div>
														)}
													</div>
													<button
														type="button"
														onClick={() => {
															if (window.confirm(`Are you sure you want to remove ${user.name} from this role?`)) {
																handleRemoveUserFromRole(user.id);
															}
														}}
														className="remove-user-btn"
													>
														Remove
													</button>
												</div>
											))}
										</div>
									)}
								</div>

								{/* Add users to role */}
								<div className="users-section">
									<h3>Add users to this role</h3>
									{getUsersNotInRole().length === 0 ? (
										<div className="no-users-message">
											All users are already assigned to this role.
										</div>
									) : (
										<div className="users-list">
											{getUsersNotInRole().map((user) => {
												const userCurrentRole = roles.find(r => r.id === Number(user.role));
												return (
													<div key={user.id} className="user-item">
														<div className="user-info">
															<div className="user-name">{user.name}</div>
															<div className="user-email">{user.email}</div>
															{user.phone && (
																<div className="user-phone">{user.phone}</div>
															)}
															<div className="user-current-role">
																Current role: {userCurrentRole?.name || 'Unknown'}
															</div>
														</div>
														<button
															type="button"
															onClick={() => {
																if (window.confirm(`Add ${user.name} to ${editingRole.name} role?`)) {
																	handleAddUserToRole(user.id);
																}
															}}
															className="add-user-btn"
														>
															Add
														</button>
													</div>
												);
											})}
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default RoleManagement;

