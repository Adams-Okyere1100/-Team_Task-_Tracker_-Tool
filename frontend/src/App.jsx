import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  ArrowRight,
  Bell,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  ClipboardList,
  Layers3,
  LogOut,
  Plus,
  Search,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import AuthScreen from './components/AuthScreen.jsx';
import TaskCard from './components/TaskCard.jsx';
import TaskModal from './components/TaskModal.jsx';
import { apiRequest } from './lib/api.js';

const columns = [
  { title: 'To Do', icon: CircleDashed, className: 'column-todo', note: 'Ready when you are' },
  { title: 'In Progress', icon: ArrowDownUp, className: 'column-progress', note: 'Moving forward' },
  { title: 'Completed', icon: CheckCircle2, className: 'column-completed', note: 'Nicely done' },
];

const navItems = [
  { id: 'team', label: 'Team board', icon: Layers3 },
  { id: 'mine', label: 'Assigned to me', icon: ClipboardList },
  { id: 'created', label: 'Created by me', icon: CalendarCheck2 },
];

function initials(name = '') {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

function formatToday() {
  return new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [activeView, setActiveView] = useState('team');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [modalTask, setModalTask] = useState(undefined);
  const [logoutPending, setLogoutPending] = useState(false);

  useEffect(() => {
    apiRequest('/auth/me')
      .then(({ user: authenticatedUser }) => setUser(authenticatedUser))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setUsers([]);
      return;
    }
    setDataLoading(true);
    setPageError('');
    Promise.all([apiRequest('/tasks'), apiRequest('/users')])
      .then(([taskPayload, userPayload]) => {
        setTasks(taskPayload.tasks);
        setUsers(userPayload.users);
      })
      .catch((error) => setPageError(error.message))
      .finally(() => setDataLoading(false));
  }, [user]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timeout = window.setTimeout(() => setFeedback(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const visibleTasks = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (activeView === 'mine' && task.assignedTo !== user.id) return false;
      if (activeView === 'created' && task.createdBy !== user.id) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (assigneeFilter !== 'all' && task.assignedTo !== assigneeFilter) return false;
      if (needle && !`${task.title} ${task.description} ${task.assigneeName || ''} ${task.creatorName || ''}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [tasks, activeView, user, priorityFilter, assigneeFilter, search]);

  const completedCount = tasks.filter((task) => task.status === 'Completed').length;
  const completionRate = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const activeCount = tasks.filter((task) => task.status === 'In Progress').length;
  const overdueCount = tasks.filter((task) => task.dueDate
    && task.status !== 'Completed'
    && task.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10)).length;
  const today = formatToday();

  async function reloadTasks() {
    const { tasks: refreshedTasks } = await apiRequest('/tasks');
    setTasks(refreshedTasks);
  }

  async function saveTask(values) {
    const isEditing = Boolean(modalTask?.id);
    await apiRequest(isEditing ? `/tasks/${modalTask.id}` : '/tasks', {
      method: isEditing ? 'PATCH' : 'POST',
      body: JSON.stringify(values),
    });
    await reloadTasks();
    setModalTask(undefined);
    setFeedback(isEditing ? 'Task changes saved.' : 'Task added to the board.');
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete “${task.title}”? This can’t be undone.`)) return;
    try {
      await apiRequest(`/tasks/${task.id}`, { method: 'DELETE' });
      setTasks((current) => current.filter((item) => item.id !== task.id));
      setFeedback('Task deleted.');
    } catch (error) {
      setPageError(error.message);
    }
  }

  async function changeTaskStatus(task, status) {
    try {
      await apiRequest(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
      setFeedback(status === 'Completed' ? 'Task completed. Nice work.' : `Moved to ${status}.`);
    } catch (error) {
      setPageError(error.message);
    }
  }

  async function logout() {
    setLogoutPending(true);
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setActiveView('team');
      setLogoutPending(false);
    }
  }

  if (authLoading) {
    return <main className="loading-screen"><span className="loading-mark"><Layers3 size={23} /></span><span>Getting your workspace ready…</span></main>;
  }

  if (!user) return <AuthScreen onAuthenticated={setUser} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a aria-label="Tandem home" className="brand" href="#board">
          <span className="brand-mark"><Layers3 size={20} /></span>
          <span className="brand-word">tandem<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-switcher">
          <span className="workspace-glyph">{initials(user.name).slice(0, 1)}</span>
          <span className="workspace-name"><strong>Team workspace</strong><small>Shared space</small></span>
          <ChevronDown aria-hidden="true" size={15} />
        </div>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav aria-label="Workspace" className="primary-nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button aria-current={activeView === id ? 'page' : undefined} className={`nav-item ${activeView === id ? 'nav-item-active' : ''}`} key={id} onClick={() => setActiveView(id)} type="button">
              <Icon aria-hidden="true" size={17} /><span>{label}</span>
              {id === 'team' && <span className="nav-count">{tasks.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <section className="sidebar-progress" aria-label="Team completion">
          <div className="progress-topline"><span>TEAM PROGRESS</span><Sparkles size={14} /></div>
          <div className="progress-number">{completionRate}<span>%</span></div>
          <div className="progress-track"><span style={{ width: `${completionRate}%` }} /></div>
          <p>{completedCount} of {tasks.length} tasks completed</p>
        </section>
        <div className="sidebar-bottom">
          <div className="profile-card">
            <span className="avatar profile-avatar">{initials(user.name)}</span>
            <span className="profile-info"><strong>{user.name}</strong><small>{user.email}</small></span>
            <button aria-label="Sign out" className="profile-logout" disabled={logoutPending} onClick={logout} title="Sign out" type="button"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <main className="main-content" id="board">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><Layers3 size={18} /></span>tandem<span className="brand-period">.</span></div>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-divider">/</span><strong>{navItems.find((item) => item.id === activeView)?.label}</strong></div>
          <div className="topbar-right"><span className="today-label">{today}</span><button aria-label="Notifications" className="topbar-icon" title="Notifications" type="button"><Bell size={17} /><i /></button><span className="avatar topbar-avatar">{initials(user.name)}</span></div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <p className="eyebrow">YOUR TEAM, IN MOTION</p>
              <h1>{activeView === 'team' ? 'Team board' : activeView === 'mine' ? 'Assigned to me' : 'Created by me'}<span className="heading-period">.</span></h1>
              <p className="page-subtitle">A clear view of the work, and who’s moving it forward.</p>
            </div>
            <button className="button button-primary add-task-button" onClick={() => setModalTask(null)} type="button"><Plus size={18} />New task</button>
          </section>

          <section aria-label="Team summary" className="summary-strip">
            <div className="summary-item">
              <span className="summary-icon summary-icon-total"><ClipboardList size={17} /></span>
              <span className="summary-copy"><small>Open tasks</small><strong>{tasks.length - completedCount}</strong></span>
              <span className="summary-note">across the team</span>
            </div>
            <div className="summary-item">
              <span className="summary-icon summary-icon-moving"><ArrowRight size={17} /></span>
              <span className="summary-copy"><small>In progress</small><strong>{activeCount}</strong></span>
              <span className="summary-note">being worked on</span>
            </div>
            <div className="summary-item">
              <span className={`summary-icon ${overdueCount ? 'summary-icon-overdue' : 'summary-icon-done'}`}><CalendarCheck2 size={17} /></span>
              <span className="summary-copy"><small>Past due</small><strong>{overdueCount}</strong></span>
              <span className="summary-note">needs attention</span>
            </div>
            <div className="summary-completion"><span>Completion</span><div className="summary-completion-track"><span style={{ width: `${completionRate}%` }} /></div><strong>{completionRate}%</strong></div>
          </section>

          <section aria-label="Task controls" className="board-toolbar">
            <div className="board-toolbar-title"><UsersRound size={17} /><strong>Shared progress</strong><span className="toolbar-separator" /><span>{users.length} {users.length === 1 ? 'member' : 'members'}</span></div>
            <div className="board-controls">
              <label className="search-box"><Search size={16} /><span className="sr-only">Search tasks</span><input onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks…" type="search" value={search} /></label>
              <label className="filter-select"><span className="sr-only">Filter by priority</span><select onChange={(event) => setPriorityFilter(event.target.value)} value={priorityFilter}><option value="all">All priorities</option><option>High</option><option>Medium</option><option>Low</option></select><ChevronDown size={14} /></label>
              <label className="filter-select filter-assignee"><span className="sr-only">Filter by assignee</span><select onChange={(event) => setAssigneeFilter(event.target.value)} value={assigneeFilter}><option value="all">All assignees</option><option value="unassigned">Unassigned</option>{users.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><ChevronDown size={14} /></label>
            </div>
          </section>

          {pageError && <div className="page-alert" role="alert"><span>{pageError}</span><button aria-label="Dismiss error" onClick={() => setPageError('')} type="button">×</button></div>}

          {dataLoading ? (
            <div className="board-loading"><span className="loading-ring" />Loading team tasks…</div>
          ) : (
            <section aria-label="Kanban task board" className="board-grid">
              {columns.map(({ title, icon: Icon, className, note }) => {
                const columnTasks = visibleTasks.filter((task) => task.status === title);
                return (
                  <section aria-labelledby={`column-${title.replaceAll(' ', '-')}`} className={`board-column ${className}`} key={title}>
                    <header className="column-header">
                      <div className="column-title-group"><span className="column-icon"><Icon size={17} /></span><h2 id={`column-${title.replaceAll(' ', '-')}`}>{title}</h2><span className="column-count">{columnTasks.length}</span></div>
                      <p>{note}</p>
                    </header>
                    <div className="task-list">
                      {columnTasks.map((task) => <TaskCard currentUser={user} key={task.id} onDelete={deleteTask} onEdit={setModalTask} onStatusChange={changeTaskStatus} task={task} />)}
                      {!columnTasks.length && <div className="column-empty"><span className="empty-icon"><Check size={17} /></span><span>{tasks.length ? 'Nothing here right now' : 'Your board starts here'}</span></div>}
                      {title === 'To Do' && <button className="quick-add-task" onClick={() => setModalTask(null)} type="button"><Plus size={15} />Add a task</button>}
                    </div>
                  </section>
                );
              })}
            </section>
          )}

          {!dataLoading && !visibleTasks.length && tasks.length > 0 && <p className="filter-empty">No tasks match these filters. <button onClick={() => { setSearch(''); setPriorityFilter('all'); setAssigneeFilter('all'); setActiveView('team'); }} type="button">Clear filters</button></p>}
          <footer className="page-footer"><span><span className="footer-pulse" />All changes are shared with your team</span><span>Make good things happen, together.</span></footer>
        </div>
      </main>

      {modalTask !== undefined && <TaskModal onClose={() => setModalTask(undefined)} onSave={saveTask} task={modalTask} users={users} />}
      {feedback && <div className="toast" role="status"><CheckCircle2 size={17} />{feedback}</div>}
    </div>
  );
}