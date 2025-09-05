import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Button,
  Chip,
  Divider
} from '@mui/material';
import { 
  People, 
  Work, 
  AccessTime, 
  AttachMoney,
  Receipt,
  Person,
  Add,
  TrendingUp,
  Schedule
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { clientsAPI, projectsAPI, timeEntriesAPI, invoicesAPI } from '../../services/api';
import { formatCurrency } from '../../utils';
import { TimeEntry } from '../../types';
import StatsCard from '../common/StatsCard';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalClients: number;
  totalProjects: number;
  totalTimeEntries: number;
  totalInvoices: number;
  totalRevenue: number;
}

interface RecentActivity {
  id: string;
  type: 'invoice' | 'payment' | 'timeEntry' | 'client';
  title: string;
  description: string;
  date: string;
  status?: string;
  amount?: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalProjects: 0,
    totalTimeEntries: 0,
    totalInvoices: 0,
    totalRevenue: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [recentTimeEntries, setRecentTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [clientsRes, projectsRes, timeEntriesRes, invoicesRes] = await Promise.all([
          clientsAPI.getAll(),
          projectsAPI.getAll(),
          timeEntriesAPI.getAll(),
          invoicesAPI.getAll(),
        ]);

        // Calculate total revenue from paid invoices
        const totalRevenue = invoicesRes.invoices
          .filter(invoice => invoice.status === 'paid')
          .reduce((sum, invoice) => sum + parseFloat(invoice.totalAmount), 0);

        setStats({
          totalClients: clientsRes.total,
          totalProjects: projectsRes.total,
          totalTimeEntries: timeEntriesRes.total,
          totalInvoices: invoicesRes.total,
          totalRevenue,
        });

        // Get recent time entries (last 5)
        const sortedTimeEntries = timeEntriesRes.timeEntries
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);
        setRecentTimeEntries(sortedTimeEntries);

        // Create recent activities from invoices and time entries
        const activities: RecentActivity[] = [];

        // Add recent invoices
        invoicesRes.invoices
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3)
          .forEach(invoice => {
            activities.push({
              id: `invoice-${invoice.id}`,
              type: 'invoice',
              title: `Invoice ${invoice.invoiceNumber}`,
              description: `${invoice.clientName} - ${formatCurrency(parseFloat(invoice.totalAmount), 'PHP')}`,
              date: invoice.createdAt,
              status: invoice.status,
              amount: parseFloat(invoice.totalAmount),
            });
          });

        // Add recent time entries
        timeEntriesRes.timeEntries
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 2)
          .forEach(entry => {
            activities.push({
              id: `time-${entry.id}`,
              type: 'timeEntry',
              title: `${entry.hoursLogged}h logged`,
              description: `${entry.projectName} - ${entry.description || 'No description'}`,
              date: entry.createdAt,
            });
          });

        // Sort all activities by date
        activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentActivities(activities.slice(0, 5));

      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." fullScreen />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h3" 
          gutterBottom 
          sx={{ 
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1
          }}
        >
          Welcome back, {user?.contactPerson || user?.email?.split('@')[0]}! 👋
        </Typography>

        <Typography 
          variant="h6" 
          color="text.secondary" 
          gutterBottom
          sx={{ fontStyle: 'italic', opacity: 0.8 }}
        >
          Ready to manage your business today?
        </Typography>

        {user?.companyName && (
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {user.companyName}
          </Typography>
        )}
      </Box>

      {/* Stats Cards Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: '1fr 1fr 1fr 1fr',
          },
          gap: 3,
          mb: 4,
        }}
      >
        <StatsCard
          title="Total Clients"
          value={stats.totalClients}
          icon={People}
          color="#1976d2"
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Active Projects"
          value={stats.totalProjects}
          icon={Work}
          color="#388e3c"
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Time Entries"
          value={stats.totalTimeEntries}
          icon={AccessTime}
          color="#f57c00"
          subtitle="Total logged"
        />
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue, 'PHP')}
          icon={AttachMoney}
          color="#7b1fa2"
          subtitle="From paid invoices"
          trend={{ value: 24, isPositive: true }}
        />
      </Box>

      {/* Content Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          gap: 3,
        }}
      >
        {/* Recent Activity */}
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
              <TrendingUp sx={{ mr: 1 }} />
              Recent Activity
            </Typography>
          </Box>
          
          {recentActivities.length > 0 ? (
            <List sx={{ p: 0 }}>
              {recentActivities.map((activity, index) => (
                <Box key={activity.id}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon>
                      {activity.type === 'invoice' && <Receipt color="primary" />}
                      {activity.type === 'timeEntry' && <Schedule color="secondary" />}
                      {activity.type === 'payment' && <AttachMoney color="success" />}
                      {activity.type === 'client' && <People color="info" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.title}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {activity.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(activity.date).toLocaleDateString()} at {new Date(activity.date).toLocaleTimeString()}
                          </Typography>
                        </Box>
                      }
                    />
                    {activity.status && (
                      <Chip 
                        label={activity.status} 
                        size="small" 
                        color={
                          activity.status === 'paid' ? 'success' : 
                          activity.status === 'sent' ? 'warning' : 
                          activity.status === 'draft' ? 'default' : 'error'
                        }
                      />
                    )}
                  </ListItem>
                  {index < recentActivities.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No recent activity yet. Start by creating invoices or logging time entries!
            </Typography>
          )}
        </Paper>

        {/* Right Side Panel */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Quick Actions */}
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
              <Add sx={{ mr: 1 }} />
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button 
                variant="contained" 
                startIcon={<Receipt />}
                onClick={() => navigate('/invoices')}
                fullWidth
              >
                Create Invoice
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<People />}
                onClick={() => navigate('/clients')}
                fullWidth
              >
                Add Client
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<AccessTime />}
                onClick={() => navigate('/time-entries')}
                fullWidth
              >
                Log Time
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<Person />}
                onClick={() => navigate('/profile')}
                fullWidth
              >
                Manage Profile
              </Button>
            </Box>
          </Paper>

          {/* Recent Time Entries */}
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
              <AccessTime sx={{ mr: 1 }} />
              Recent Time Entries
            </Typography>
            {recentTimeEntries.length > 0 ? (
              <List sx={{ p: 0 }}>
                {recentTimeEntries.map((entry, index) => (
                  <Box key={entry.id}>
                    <ListItem sx={{ px: 0, py: 1 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {entry.projectName}
                            </Typography>
                            <Chip label={`${entry.hoursLogged}h`} size="small" color="primary" />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {entry.description || 'No description'}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              {new Date(entry.date).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < recentTimeEntries.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No time entries logged yet.
              </Typography>
            )}
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard;
