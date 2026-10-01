import { CalendarDays, Check, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

function initials(name = '') {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

function readableDate(value) {
  if (!value) return 'No due date';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(year, month - 1, day));
}

export default function TaskCard({ task, currentUser, onEdit, onDelete, onStatusChange }) {
  const canEdit = task.createdBy === currentUser.id;
  const canChangeStatus = canEdit || task.assignedTo === currentUser.id;
  const isOverdue = task.dueDate
    && task.status !== 'Completed'
    && task.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10);

  return (
    <article className={`task-card priority-${task.priority.toLowerCase()} ${task.status === 'Completed' ? 'task-card-done' : ''}`}>
      <div className="task-card-topline">
        <span className={`priority-label priority-label-${task.priority.toLowerCase()}`}><i />{task.priority}</span>
        <div className="task-actions">
          {canEdit && <button aria-label={`Edit ${task.title}`} className="task-icon-button" onClick={() => onEdit(task)} title="Edit task" type="button"><Pencil size={15} /></button>}
          {canEdit && <button aria-label={`Delete ${task.title}`} className="task-icon-button task-delete-button" onClick={() => onDelete(task)} title="Delete task" type="button"><Trash2 size={15} /></button>}
          {!canEdit && <MoreHorizontal aria-hidden="true" className="muted-icon" size={17} />}
        </div>
      </div>
      <h3>{task.title}</h3>
      {task.description && <p className="task-description">{task.description}</p>}
      <div className={`task-due ${isOverdue ? 'task-overdue' : ''}`}>
        <CalendarDays size={14} />
        <span>{isOverdue ? 'Overdue · ' : ''}{readableDate(task.dueDate)}</span>
      </div>
      <div className="task-card-footer">
        <div className="assignee" title={task.assigneeName || 'Unassigned'}>
          <span className={`avatar avatar-small ${task.assigneeName ? '' : 'avatar-empty'}`}>{task.assigneeName ? initials(task.assigneeName) : '+'}</span>
          <span className="assignee-name">{task.assigneeName || 'Unassigned'}</span>
        </div>
        {canChangeStatus ? (
          <label className="status-control">
            <span className="sr-only">Move {task.title}</span>
            <select aria-label={`Move ${task.title}`} onChange={(event) => onStatusChange(task, event.target.value)} value={task.status}>
              <option>To Do</option><option>In Progress</option><option>Completed</option>
            </select>
            {task.status === 'Completed' && <Check aria-hidden="true" size={12} />}
          </label>
        ) : <span className="status-readonly">{task.status}</span>}
      </div>
    </article>
  );
}