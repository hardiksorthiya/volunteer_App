import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import { SearchIcon, EditIcon, UserIcon, TrashIcon } from '../components/Icons';
import RoleEditModal from '../components/RoleEditModal';
import UserEditModal from '../components/UserEditModal';
import '../css/UsersList.css';

const UsersList = () => {
	const navigate = useNavigate();
	const [users, setUsers] = useState([]);
	const [roles, setRoles] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [search, setSearch] = useState('');
	const [selectedUser, setSelectedUser] = useState(null);
	const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [success, setSuccess] = useState('');
	const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

	useEffect(() => {
		const token = localStorage.getItem('token');
		if (!token) {
			navigate('/login');
			return;
		}

		fetchRoles();
		checkPermissionAndFetchUsers();
	}, [navigate]);

	const fetchRoles = async () => {
		try {
			const response = await api.get('/roles');
			if (response.data.success) {
				setRoles(response.data.data || []);
			}
		} catch (err) {
			console.error('Error fetching roles:', err);
			// Don't show error to user, just log it - roles will use fallback
		}
	};

	const checkPermissionAndFetchUsers = async () => {
		try {
			// Check if user has permission to access user management
			const permissionResponse = await api.get('/permissions/check/user_management');
			
			if (permissionResponse.data.success && permissionResponse.data.hasAccess) {
				fetchUsers();
			} else {
				setError('Access denied. You do not have permission to view user management.');
				setLoading(false);
			}
		} catch (err) {
			console.error('Error checking permission:', err);
			// If permission check fails (e.g., table doesn't exist), try to fetch users anyway
			// Backend will handle the permission check and allow admins through
			if (err.response?.status === 403) {
				setError('Access denied. You do not have permission to view user management.');
				setLoading(false);
			} else {
				// Try to fetch users - backend will handle permission check
				// This handles cases where the permissions table doesn't exist yet
				fetchUsers();
			}
		}
	};

	const fetchUsers = async () => {
		setLoading(true);
		setError('');

		try {
			const response = await api.get('/users');
			
			if (response.data.success) {
				// Backend returns { success: true, data: users }
				const usersList = response.data.data || [];
				setUsers(usersList);
			} else {
				setError(response.data.message || 'Failed to fetch users');
				setUsers([]);
			}
		} catch (err) {
			console.error('Error fetching users:', err);
			console.error('Error details:', {
				status: err.response?.status,
				message: err.response?.data?.message,
				user: JSON.parse(localStorage.getItem('user') || '{}')
			});
			let errorMessage = err.response?.data?.message || err.message || 'Failed to load users';
			
			// Check if it's a migration issue
			if (errorMessage.includes('migration') || errorMessage.includes('table not found')) {
				errorMessage = 'Permissions table not found. Please run database migration:\n\ncd backend\nnpx knex migrate:latest';
			}
			
			setError(errorMessage);
			setUsers([]);
			
			// Only redirect on 401 (unauthorized), show error for 403 (forbidden)
			if (err.response?.status === 401) {
				localStorage.removeItem('token');
				localStorage.removeItem('user');
				navigate('/login');
			} else if (err.response?.status === 403) {
				// For 403, show error but don't redirect - user might have wrong permissions
				setError('Access denied. You do not have permission to view user management.');
			}
		} finally {
			setLoading(false);
		}
	};

	const filteredUsers = users.filter((user) =>
		user.name?.toLowerCase().includes(search.toLowerCase()) ||
		user.email?.toLowerCase().includes(search.toLowerCase())
	);

	const handleRoleEdit = (user) => {
		setSelectedUser(user);
		setIsRoleModalOpen(true);
	};

	const handleRoleUpdate = () => {
		fetchUsers();
		setSuccess('Role updated successfully!');
		setTimeout(() => setSuccess(''), 3000);
	};

	const handleEditUser = (user) => {
		setSelectedUser(user);
		setIsEditModalOpen(true);
	};

	const handleUserUpdate = () => {
		fetchUsers();
		setSuccess('User updated successfully!');
		setTimeout(() => setSuccess(''), 3000);
	};

	const handleToggleStatus = async (user) => {
		if (!window.confirm(`Are you sure you want to ${user.is_active ? 'deactivate' : 'activate'} ${user.name}?`)) {
			return;
		}

		try {
			const response = await api.put(`/users/${user.id}/status`, {
				is_active: !user.is_active
			});

			if (response.data.success) {
				setSuccess(response.data.message);
				fetchUsers();
				setTimeout(() => setSuccess(''), 3000);
			}
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to update user status');
			setTimeout(() => setError(''), 5000);
		}
	};

	const handleDeleteUser = async (user) => {
		if (!window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
			return;
		}

		try {
			const response = await api.delete(`/users/${user.id}`);

			if (response.data.success) {
				setSuccess('User deleted successfully!');
				fetchUsers();
				setTimeout(() => setSuccess(''), 3000);
			}
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to delete user');
			setTimeout(() => setError(''), 5000);
		}
	};

	const getRoleName = (roleId) => {
		const role = roles.find(r => r.id === roleId);
		if (role) return role.name;
		// Fallback for legacy roles
		return roleId === 0 ? 'Admin' : roleId === 1 ? 'Volunteer' : 'Unknown';
	};

	const getRoleBadgeClass = (roleId) => {
		const role = roles.find(r => r.id === roleId);
		if (role) {
			// Use role name for class (e.g., "admin" -> "role-badge-admin")
			return `role-badge-${role.name.toLowerCase().replace(/\s+/g, '-')}`;
		}
		// Fallback for legacy roles
		return roleId === 0 ? 'role-badge-admin' : 'role-badge-volunteer';
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
							<h1 className="mb-1 fw-bold text-white" style={{ fontSize: '1.75rem' }}>User Management</h1>
							<p className="text-white mb-0" style={{ opacity: 0.9 }}>View and manage all system users</p>
						</div>
						<div className="d-flex align-items-center gap-2" style={{ minWidth: '300px', maxWidth: '400px' }}>
							<div className="position-relative flex-grow-1">
								<div style={{
									position: 'absolute',
									left: '16px',
									top: '50%',
									transform: 'translateY(-50%)',
									zIndex: 10,
									pointerEvents: 'none',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center'
								}}>
									<SearchIcon style={{ 
										width: '20px',
										height: '20px',
										color: 'rgba(255, 255, 255, 0.7)',
										strokeWidth: '2.5'
									}} />
								</div>
								<input
									type="text"
									placeholder="Search users..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="form-control"
									style={{ 
										paddingLeft: '48px',
										paddingRight: '16px',
										paddingTop: '0.75rem',
										paddingBottom: '0.75rem',
										borderRadius: '10px',
										border: '2px solid rgba(255, 255, 255, 0.3)',
										background: 'rgba(255, 255, 255, 0.15)',
										color: '#ffffff',
										fontSize: '0.9375rem',
										fontWeight: '400'
									}}
									onFocus={(e) => {
										e.target.style.background = 'rgba(255, 255, 255, 0.25)';
										e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
									}}
									onBlur={(e) => {
										e.target.style.background = 'rgba(255, 255, 255, 0.15)';
										e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
									}}
								/>
							</div>
						</div>
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

				{/* Users Table */}
				<div className="card shadow-sm border-0" style={{ borderRadius: '16px' }}>
					<div className="card-body p-0">
						<div className="table-responsive">
							<table className="table table-hover table-striped align-middle mb-0">
								<thead>
									<tr className="table-header-users">
										<th style={{ color: '#ffffff', fontWeight: '600', padding: '1rem', border: 'none' }}>User</th>
										<th style={{ color: '#ffffff', fontWeight: '600', padding: '1rem', border: 'none' }}>Email</th>
										<th style={{ color: '#ffffff', fontWeight: '600', padding: '1rem', border: 'none' }}>Phone</th>
										<th style={{ color: '#ffffff', fontWeight: '600', padding: '1rem', border: 'none' }}>Role</th>
										<th style={{ color: '#ffffff', fontWeight: '600', padding: '1rem', border: 'none' }}>Status</th>
										<th style={{ color: '#ffffff', fontWeight: '600', padding: '1rem', textAlign: 'center', border: 'none' }}>Action</th>
									</tr>
								</thead>
								<tbody>
									{filteredUsers.length === 0 ? (
										<tr>
											<td colSpan="6" className="text-center py-5 text-muted">
												No users found
											</td>
										</tr>
									) : (
										filteredUsers.map((user) => (
											<tr key={user.id}>
												<td style={{ padding: '1rem' }}>
													<div className="d-flex align-items-center gap-3">
														<div className="d-flex align-items-center justify-content-center rounded-circle" style={{
															width: '40px',
															height: '40px',
															background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
															color: '#ffffff',
															fontWeight: '600',
															fontSize: '0.875rem',
															flexShrink: 0
														}}>
															{user.name ? user.name.charAt(0).toUpperCase() : <UserIcon style={{ width: '20px', height: '20px' }} />}
														</div>
														<span className="fw-semibold" style={{ color: '#1e293b' }}>{user.name || 'N/A'}</span>
													</div>
												</td>
												<td style={{ padding: '1rem', color: '#475569' }}>{user.email || '-'}</td>
												<td style={{ padding: '1rem', color: '#475569' }}>{user.phone || '-'}</td>
												<td style={{ padding: '1rem' }}>
													<span 
														className={`badge ${getRoleBadgeClass(user.role)}`}
														onClick={() => handleRoleEdit(user)}
														style={{ 
															cursor: 'pointer',
															padding: '0.375rem 0.75rem',
															borderRadius: '6px',
															fontSize: '0.875rem',
															fontWeight: '600'
														}}
														title="Click to edit role"
													>
														{getRoleName(user.role)}
													</span>
												</td>
												<td style={{ padding: '1rem' }}>
													<span 
														className={`badge ${user.is_active ? 'bg-success' : 'bg-secondary'}`}
														onClick={() => handleToggleStatus(user)}
														style={{ 
															cursor: currentUser.id === user.id ? 'not-allowed' : 'pointer',
															opacity: currentUser.id === user.id ? 0.6 : 1,
															padding: '0.375rem 0.75rem',
															borderRadius: '6px',
															fontSize: '0.875rem',
															fontWeight: '600'
														}}
														title={currentUser.id === user.id ? 'Cannot change your own status' : 'Click to toggle status'}
													>
														{user.is_active ? 'Active' : 'Inactive'}
													</span>
												</td>
												<td style={{ padding: '1rem', textAlign: 'center' }}>
													<div className="d-flex align-items-center justify-content-center gap-2">
														<button
															className="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-center"
															onClick={() => handleEditUser(user)}
															title="Edit user details"
															style={{
																width: '36px',
																height: '36px',
																padding: 0,
																borderRadius: '8px'
															}}
														>
															<EditIcon style={{ width: '16px', height: '16px' }} />
														</button>
														<button
															className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center"
															onClick={() => handleDeleteUser(user)}
															disabled={currentUser.id === user.id}
															title={currentUser.id === user.id ? 'Cannot delete your own account' : 'Delete user'}
															style={{ 
																width: '36px',
																height: '36px',
																padding: 0,
																borderRadius: '8px',
																opacity: currentUser.id === user.id ? 0.5 : 1,
																cursor: currentUser.id === user.id ? 'not-allowed' : 'pointer'
															}}
														>
															<TrashIcon style={{ width: '16px', height: '16px' }} />
														</button>
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

			{selectedUser && (
				<>
					<RoleEditModal
						user={selectedUser}
						isOpen={isRoleModalOpen}
						onClose={() => {
							setIsRoleModalOpen(false);
							setSelectedUser(null);
						}}
						onUpdate={handleRoleUpdate}
					/>
					<UserEditModal
						user={selectedUser}
						isOpen={isEditModalOpen}
						onClose={() => {
							setIsEditModalOpen(false);
							setSelectedUser(null);
						}}
						onUpdate={handleUserUpdate}
					/>
				</>
			)}
		</div>
	);
};

export default UsersList;
