export function taskUpdatePermission(userId, task, changes) {
  if (task.created_by === userId) return 'edit';
  if (
    task.assigned_to === userId
    && Object.keys(changes).length === 1
    && Object.hasOwn(changes, 'status')
  ) return 'status';
  return null;
}

export function canDeleteTask(userId, task) {
  return task.created_by === userId;
}