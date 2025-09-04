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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
  Work as WorkIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { timeEntriesAPI, projectsAPI } from '../../services/api';
import { TimeEntry, TimeEntryFormData, Project } from '../../types';
import { formatDate, formatTime } from '../../utils';

const TimeEntries: React.FC = () => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Timer state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [timerDescription, setTimerDescription] = useState('');

  const { control, handleSubmit, reset, formState: { errors } } = useForm<TimeEntryFormData>({
    defaultValues: {
      projectId: 0,
      date: new Date().toISOString().split('T')[0],
      hoursLogged: 0,
      description: '',
    },
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const fetchTimeEntries = async () => {
    try {
      setLoading(true);
      const [entriesRes, projectsRes] = await Promise.all([
        timeEntriesAPI.getAll(),
        projectsAPI.getAll()
      ]);
      setTimeEntries(entriesRes.timeEntries);
      setProjects(projectsRes.projects);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load time entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeEntries();
  }, []);

  const handleOpen = (entry?: TimeEntry) => {
    if (entry) {
      setEditingEntry(entry);
      reset({
        projectId: entry.projectId,
        date: entry.date,
        hoursLogged: parseFloat(entry.hoursLogged),
        description: entry.description || '',
      });
    } else {
      setEditingEntry(null);
      reset({
        projectId: 0,
        date: new Date().toISOString().split('T')[0],
        hoursLogged: 0,
        description: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingEntry(null);
    reset();
  };

  const onSubmit = async (data: TimeEntryFormData) => {
    try {
      setSubmitting(true);
      if (editingEntry) {
        // Exclude projectId from updates since it can't be changed
        const { projectId, ...updateData } = data;
        await timeEntriesAPI.update(editingEntry.id, updateData);
      } else {
        await timeEntriesAPI.create(data);
      }
      await fetchTimeEntries();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save time entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this time entry?')) {
      try {
        await timeEntriesAPI.delete(id);
        await fetchTimeEntries();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete time entry');
      }
    }
  };

  const startTimer = (projectId: number) => {
    setActiveProjectId(projectId);
    setTimerSeconds(0);
    setTimerDescription('');
    setIsTimerRunning(true);
  };

  const stopTimer = async () => {
    if (activeProjectId && timerSeconds > 0) {
      const hours = timerSeconds / 3600; // Convert seconds to hours
      try {
        await timeEntriesAPI.create({
          projectId: activeProjectId,
          date: new Date().toISOString().split('T')[0],
          hoursLogged: hours,
          description: timerDescription || 'Timer entry',
        });
        await fetchTimeEntries();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to save timer entry');
      }
    }
    setIsTimerRunning(false);
    setTimerSeconds(0);
    setActiveProjectId(null);
    setTimerDescription('');
  };

  const formatTimerDisplay = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProjectName = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    return project?.projectName || 'Unknown Project';
  };

  const getClientName = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    return project?.clientName || 'Unknown Client';
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
        <Typography variant="h4">Time Tracking</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Entry
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Timer Section */}
      {isTimerRunning && (
        <Card sx={{ mb: 3, backgroundColor: 'primary.main', color: 'white' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6">
                  Timer Running: {getProjectName(activeProjectId!)}
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: 'monospace' }}>
                  {formatTimerDisplay(timerSeconds)}
                </Typography>
                <TextField
                  size="small"
                  placeholder="What are you working on?"
                  value={timerDescription}
                  onChange={(e) => setTimerDescription(e.target.value)}
                  sx={{ 
                    mt: 1, 
                    backgroundColor: 'white',
                    borderRadius: 1,
                    '& .MuiInputBase-input': { color: 'black' }
                  }}
                />
              </Box>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<StopIcon />}
                onClick={stopTimer}
                size="large"
              >
                Stop Timer
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Quick Timer Start */}
      {!isTimerRunning && projects.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Timer Start
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 2 }}>
              {projects.filter(p => p.status === 'active').map((project) => (
                <Box
                  key={project.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2">{project.projectName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getClientName(project.id)}
                    </Typography>
                  </Box>
                  <IconButton
                    color="primary"
                    onClick={() => startTimer(project.id)}
                  >
                    <PlayIcon />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Project</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Hours</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {timeEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">
                    No time entries found. Start tracking your time to see entries here.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              timeEntries.map((entry) => (
                <TableRow key={entry.id} hover>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <WorkIcon fontSize="small" color="action" />
                      {getProjectName(entry.projectId)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <PersonIcon fontSize="small" color="action" />
                      {getClientName(entry.projectId)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <TimeIcon fontSize="small" color="action" />
                      {formatTime(parseFloat(entry.hoursLogged))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {entry.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={() => handleOpen(entry)}
                      color="primary"
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(entry.id)}
                      color="error"
                      size="small"
                    >
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
          <DialogTitle>
            {editingEntry ? 'Edit Time Entry' : 'Add New Time Entry'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Controller
                name="projectId"
                control={control}
                rules={{ required: 'Project is required', min: { value: 1, message: 'Please select a project' } }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.projectId}>
                    <InputLabel>Project</InputLabel>
                    <Select
                      {...field}
                      label="Project"
                    >
                      <MenuItem value={0}>Select a project</MenuItem>
                      {projects.map((project) => (
                        <MenuItem key={project.id} value={project.id}>
                          {project.projectName} - {getClientName(project.id)}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.projectId && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {errors.projectId.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
              
              <Controller
                name="date"
                control={control}
                rules={{ required: 'Date is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Date"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.date}
                    helperText={errors.date?.message}
                  />
                )}
              />
              
              <Controller
                name="hoursLogged"
                control={control}
                rules={{ 
                  required: 'Hours logged is required',
                  min: { value: 0.01, message: 'Hours must be greater than 0' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Hours Logged"
                    type="number"
                    inputProps={{ min: 0, step: 0.25 }}
                    fullWidth
                    error={!!errors.hoursLogged}
                    helperText={errors.hoursLogged?.message}
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
                    placeholder="What did you work on?"
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={20} /> : (editingEntry ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default TimeEntries;
