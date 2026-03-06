'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Users,
  Inbox,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface Project {
  id: string;
  name: string;
  code: string;
  client: string;
  status: 'active' | 'inactive' | 'completed' | 'on_hold';
  budgetHours: number;
  billable: boolean;
}

interface TaskCategory {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface ProjectAssignment {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  allocatedHours: number;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
];

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  completed: 'bg-blue-50 text-blue-700',
  on_hold: 'bg-yellow-50 text-yellow-700',
};

const defaultProject: Omit<Project, 'id'> = {
  name: '',
  code: '',
  client: '',
  status: 'active',
  budgetHours: 0,
  billable: true,
};

export default function ProjectConfigTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Project modal
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState<Omit<Project, 'id'>>(defaultProject);
  const [isSavingProject, setIsSavingProject] = useState(false);

  // Category inline edit
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryDesc, setEditCategoryDesc] = useState('');

  // Project assignments
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [projRes, catRes] = await Promise.all([
        api.get('/daily-work-logging/admin/projects'),
        api.get('/daily-work-logging/admin/projects/categories'),
      ]);
      setProjects(Array.isArray(projRes.data) ? projRes.data : projRes.data?.data || []);
      setCategories(Array.isArray(catRes.data) ? catRes.data : catRes.data?.data || []);
    } catch {
      setError('Failed to load projects and categories.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveProject = async () => {
    setError(null);
    if (!projectForm.name.trim()) {
      setError('Project name is required.');
      return;
    }
    setIsSavingProject(true);
    try {
      if (editingProject) {
        await api.patch(`/daily-work-logging/admin/projects/${editingProject.id}`, projectForm);
        setProjects((prev) =>
          prev.map((p) => (p.id === editingProject.id ? { ...p, ...projectForm } : p))
        );
        setSuccess('Project updated successfully.');
      } else {
        const res = await api.post('/daily-work-logging/admin/projects', projectForm);
        const newProj = res.data?.data || res.data;
        setProjects((prev) => [...prev, newProj]);
        setSuccess('Project created successfully.');
      }
      setShowProjectModal(false);
      setEditingProject(null);
      setProjectForm(defaultProject);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save project.');
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    setError(null);
    try {
      await api.delete(`/daily-work-logging/admin/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setSuccess('Project deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete project.');
    }
  };

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name,
      code: project.code,
      client: project.client,
      status: project.status,
      budgetHours: project.budgetHours,
      billable: project.billable,
    });
    setShowProjectModal(true);
  };

  const openNewProject = () => {
    setEditingProject(null);
    setProjectForm(defaultProject);
    setShowProjectModal(true);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setError(null);
    try {
      const res = await api.post('/daily-work-logging/admin/projects/categories', {
        name: newCategoryName.trim(),
        description: newCategoryDesc.trim(),
      });
      const newCat = res.data?.data || res.data;
      setCategories((prev) => [...prev, newCat]);
      setNewCategoryName('');
      setNewCategoryDesc('');
      setSuccess('Category added.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to add category.');
    }
  };

  const handleSaveCategory = async (id: string) => {
    setError(null);
    try {
      await api.patch(`/daily-work-logging/admin/projects/categories/${id}`, {
        name: editCategoryName.trim(),
        description: editCategoryDesc.trim(),
      });
      setCategories((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, name: editCategoryName.trim(), description: editCategoryDesc.trim() } : c
        )
      );
      setEditingCategoryId(null);
      setSuccess('Category updated.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to update category.');
    }
  };

  const loadAssignments = async (projectId: string) => {
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
      return;
    }
    setSelectedProjectId(projectId);
    setIsLoadingAssignments(true);
    try {
      const res = await api.get(`/daily-work-logging/admin/projects/${projectId}/assignments`);
      setAssignments(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setAssignments([]);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading projects...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Projects & Task Categories
        </h2>
        <p className="text-sm text-text-muted">Manage projects, task categories, and team assignments.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Projects Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text">Projects</h3>
          <button
            type="button"
            onClick={openNewProject}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Project
          </button>
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Code</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Client</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Budget (hrs)</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Billable</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map((project) => (
                <>
                  <tr key={project.id} className="bg-card hover:bg-background/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text font-medium">{project.name}</td>
                    <td className="px-4 py-3 text-sm text-text-muted font-mono">{project.code}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{project.client || '--'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[project.status]}`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{project.budgetHours || '--'}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{project.billable ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditProject(project)}
                          className="p-1 text-text-muted hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => loadAssignments(project.id)}
                          className="p-1 text-text-muted hover:text-primary transition-colors"
                          title="View Assignments"
                        >
                          <Users className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(project.id)}
                          className="p-1 text-text-muted hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {selectedProjectId === project.id && (
                    <tr key={`${project.id}-assignments`} className="bg-background/30">
                      <td colSpan={7} className="px-8 py-3">
                        {isLoadingAssignments ? (
                          <div className="flex items-center gap-2 py-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />
                            <span className="text-xs text-text-muted">Loading assignments...</span>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-semibold text-text mb-2">Team Assignments for {project.name}</p>
                            {assignments.length > 0 ? (
                              <div className="border border-border rounded-lg overflow-hidden">
                                <table className="w-full">
                                  <thead>
                                    <tr className="bg-background border-b border-border">
                                      <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Employee</th>
                                      <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Role</th>
                                      <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Allocated Hours</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {assignments.map((a) => (
                                      <tr key={a.id} className="bg-card">
                                        <td className="px-3 py-1.5 text-xs text-text">{a.employeeName}</td>
                                        <td className="px-3 py-1.5 text-xs text-text-muted">{a.role}</td>
                                        <td className="px-3 py-1.5 text-xs text-text-muted">{a.allocatedHours}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-xs text-text-muted py-2">No team members assigned to this project.</p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-text-muted">No projects configured yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Categories */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Task Categories</h3>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 bg-background rounded-lg p-3 border border-border">
              {editingCategoryId === cat.id ? (
                <>
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className={`${inputClassName} flex-1`}
                    placeholder="Category name"
                  />
                  <input
                    type="text"
                    value={editCategoryDesc}
                    onChange={(e) => setEditCategoryDesc(e.target.value)}
                    className={`${inputClassName} flex-1`}
                    placeholder="Description"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveCategory(cat.id)}
                    className="p-1.5 text-green-600 hover:text-green-700 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCategoryId(null)}
                    className="p-1.5 text-text-muted hover:text-text transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-text">{cat.name}</span>
                    {cat.description && (
                      <span className="text-xs text-text-muted ml-2">- {cat.description}</span>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cat.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {cat.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategoryId(cat.id);
                      setEditCategoryName(cat.name);
                      setEditCategoryDesc(cat.description);
                    }}
                    className="p-1 text-text-muted hover:text-primary transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}

          {/* Add Category */}
          <div className="flex items-center gap-3 bg-card rounded-lg p-3 border border-dashed border-border">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className={`${inputClassName} flex-1`}
              placeholder="New category name"
            />
            <input
              type="text"
              value={newCategoryDesc}
              onChange={(e) => setNewCategoryDesc(e.target.value)}
              className={`${inputClassName} flex-1`}
              placeholder="Description (optional)"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {editingProject ? 'Edit Project' : 'Add Project'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowProjectModal(false);
                  setEditingProject(null);
                  setProjectForm(defaultProject);
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    className={inputClassName}
                    placeholder="e.g. Website Redesign"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Project Code</label>
                  <input
                    type="text"
                    value={projectForm.code}
                    onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value })}
                    className={inputClassName}
                    placeholder="e.g. WEB-001"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Client</label>
                <input
                  type="text"
                  value={projectForm.client}
                  onChange={(e) => setProjectForm({ ...projectForm, client: e.target.value })}
                  className={inputClassName}
                  placeholder="Client name"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Status</label>
                  <select
                    value={projectForm.status}
                    onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as Project['status'] })}
                    className={selectClassName}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Budget Hours</label>
                  <input
                    type="number"
                    value={projectForm.budgetHours}
                    onChange={(e) => setProjectForm({ ...projectForm, budgetHours: parseFloat(e.target.value) || 0 })}
                    min={0}
                    className={inputClassName}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={projectForm.billable}
                  onChange={(e) => setProjectForm({ ...projectForm, billable: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-text">Billable Project</span>
              </label>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={handleSaveProject}
                disabled={isSavingProject}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {isSavingProject && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingProject ? 'Update Project' : 'Create Project'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProjectModal(false);
                  setEditingProject(null);
                  setProjectForm(defaultProject);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
