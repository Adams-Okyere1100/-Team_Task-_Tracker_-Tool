import { useEffect, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';

const emptyTask = {
  title: '',
  description: '',
  status: 'To Do',
  priority: 'Medium',
  assignedTo: '',
  dueDate: '',
};

export default function TaskModal({ task, users, onClose, onSave }) {
  const [form, setForm] = useState(emptyTask);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!task) {
      setForm(emptyTask);
      return;
    }
    setForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo || '',
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
    });
  }, [task]);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await onSave({
        ...form,
        assignedTo: form.assignedTo || null,
        dueDate: form.dueDate || null,
      });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="task-modal-title" aria-modal="true" className="task-modal" role="dialog">
        <header className="modal-header">
          <div>
            <p className="eyebrow">TEAM TASK</p>
            <h2 id="task-modal-title">{task ? 'Edit task' : 'Create a task'}</h2>
          </div>
          <button aria-label="Close dialog" className="icon-button" onClick={onClose} type="button"><X size={19} /></button>
        </header>
        <form className="task-form" onSubmit={handleSubmit}>
          <label className="field-label">
            Task title
            <input autoFocus maxLength="140" onChange={updateField} placeholder="What needs to get done?" required name="title" value={form.title} />
          </label>
          <label className="field-label">
            Description <span className="optional-label">OPTIONAL</span>
            <textarea maxLength="5000" onChange={updateField} placeholder="Add context, links, or a definition of done…" name="description" rows="4" value={form.description} />
          </label>
          <div className="form-grid">
            <label className="field-label">
              Status
              <select name="status" onChange={updateField} value={form.status}>
                <option>To Do</option><option>In Progress</option><option>Completed</option>
              </select>
            </label>
            <label className="field-label">
              Priority
              <select name="priority" onChange={updateField} value={form.priority}>
                <option>Low</option><option>Medium</option><option>High</option>
              </select>
            </label>
          </div>
          <div className="form-grid">
            <label className="field-label">
              Assign to
              <select name="assignedTo" onChange={updateField} value={form.assignedTo}>
                <option value="">Unassigned</option>
                {users.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
            <label className="field-label">
              Due date
              <span className="date-input-wrap"><CalendarDays size={16} /><input name="dueDate" onChange={updateField} type="date" value={form.dueDate} /></span>
            </label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <footer className="modal-actions">
            <button className="button button-quiet" onClick={onClose} type="button">Cancel</button>
            <button className="button button-primary" disabled={pending} type="submit">{pending ? 'Saving…' : task ? 'Save changes' : 'Create task'}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}