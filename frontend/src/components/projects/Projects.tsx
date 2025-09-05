import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Work as WorkIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  CurrencyExchange as CurrencyIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { projectsAPI, clientsAPI } from '../../services/api';
import { Project, ProjectFormData, Client } from '../../types';
import { formatDate, formatCurrency } from '../../utils';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Helper function to get currency icon
  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case 'PHP':
        return '₱';
      case 'USD':
        return '$';
      default:
        return <CurrencyIcon fontSize="small" color="action" />;
    }
  };

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormData>({
    defaultValues: {
      clientId: 0,
      projectName: '',
      description: '',
      hourlyRate: 0,
      currency: 'PHP',
      status: 'active',
    },
  });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const [projectsRes, clientsRes] = await Promise.all([
        projectsAPI.getAll(),
        clientsAPI.getAll(),
      ]);
      setProjects(projectsRes.projects);
      setClients(clientsRes.clients);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleOpen = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      reset({
        clientId: project.clientId,
        projectName: project.projectName,
        description: project.description || '',
        hourlyRate: parseFloat(project.hourlyRate),
        currency: project.currency || 'PHP',
        status: project.status,
      });
    } else {
      setEditingProject(null);
      reset({
        clientId: 0,
        projectName: '',
        description: '',
        hourlyRate: 0,
        currency: 'PHP',
        status: 'active',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingProject(null);
    reset();
  };

  const onSubmit = async (data: ProjectFormData) => {
    try {
      setSubmitting(true);
      if (editingProject) {
        // Exclude clientId from updates since it can't be changed
        const { clientId, ...updateData } = data;
        await projectsAPI.update(editingProject.id, updateData);
      } else {
        await projectsAPI.create(data);
      }
      await fetchProjects();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await projectsAPI.delete(id);
        await fetchProjects();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete project');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'primary';
      case 'paused':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client?.clientName || 'Unknown Client';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Projects</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Project
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Project</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Hourly Rate</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">
                    No projects found. Create your first project to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              projects.map(project => (
                <TableRow key={project.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <WorkIcon color="action" />
                      <Box>
                        <Typography variant="subtitle2">{project.projectName}</Typography>
                        {project.description && (
                          <Typography variant="body2" color="text.secondary">
                            {project.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <PersonIcon fontSize="small" color="action" />
                      {getClientName(project.clientId)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      color={getStatusColor(project.status) as any}
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography
                        component="span"
                        sx={{ fontWeight: 'bold', color: 'action.active' }}
                      >
                        {getCurrencyIcon(project.currency || 'PHP')}
                      </Typography>
                      {parseFloat(project.hourlyRate).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      /hr
                    </Box>
                  </TableCell>
                  <TableCell>{formatDate(project.createdAt)}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpen(project)} color="primary" size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(project.id)} color="error" size="small">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editingProject ? 'Edit Project' : 'Add New Project'}</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Controller
                name="clientId"
                control={control}
                rules={{
                  required: 'Client is required',
                  min: { value: 1, message: 'Please select a client' },
                }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.clientId}>
                    <InputLabel>Client</InputLabel>
                    <Select {...field} label="Client">
                      <MenuItem value={0}>Select a client</MenuItem>
                      {clients.map(client => (
                        <MenuItem key={client.id} value={client.id}>
                          {client.clientName}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.clientId && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {errors.clientId.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />

              <Controller
                name="projectName"
                control={control}
                rules={{ required: 'Project name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Project Name"
                    fullWidth
                    error={!!errors.projectName}
                    helperText={errors.projectName?.message}
                  />
                )}
              />

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    multiline
                    rows={3}
                    fullWidth
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />

              <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
                <Controller
                  name="hourlyRate"
                  control={control}
                  rules={{
                    required: 'Hourly rate is required',
                    min: { value: 0.01, message: 'Hourly rate must be greater than 0' },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Hourly Rate"
                      type="number"
                      inputProps={{ min: 0, step: 0.01 }}
                      fullWidth
                      error={!!errors.hourlyRate}
                      helperText={errors.hourlyRate?.message}
                    />
                  )}
                />

                <Controller
                  name="currency"
                  control={control}
                  rules={{ required: 'Currency is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.currency}>
                      <InputLabel>Currency</InputLabel>
                      <Select {...field} label="Currency">
                        <MenuItem value="USD">USD ($)</MenuItem>
                        <MenuItem value="PHP">PHP (₱)</MenuItem>
                      </Select>
                      {errors.currency && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                          {errors.currency.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Box>

              <Controller
                name="status"
                control={control}
                rules={{ required: 'Status is required' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.status}>
                    <InputLabel>Status</InputLabel>
                    <Select {...field} label="Status">
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="paused">Paused</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                    </Select>
                    {errors.status && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {errors.status.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? <CircularProgress size={20} /> : editingProject ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Projects;
