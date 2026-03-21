import { PRIORITY_COLOR, CAT_COLOR, formatDate } from "../../utils/helpers";
import "./TaskItem.css";

// Splits text into parts and wraps matched segments in <mark>
function Highlight({ text, query }) {
  if (!query) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts  = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} className="task-item__highlight">{part}</mark>
          : part
      )}
    </>
  );
}

export default function TaskItem({ task, onToggle, onDelete, highlight = "" }) {
  return (
    <li className="task-item">
      {/* Left */}
      <div className="task-item__left">
        <label className="task-item__label">
          <input
            type="checkbox"
            className="task-item__checkbox"
            checked={task.completed}
            onChange={() => onToggle(task.id)}
          />
          <span className={`task-item__title${task.completed ? " task-item__title--done" : ""}`}>
            <Highlight text={task.title} query={highlight} />
          </span>
        </label>

        <div className="task-item__badges">
          <span className="task-item__badge" style={{ background: CAT_COLOR[task.category] || "#6366f1" }}>
            <Highlight text={task.category} query={highlight} />
          </span>
          <span className="task-item__badge" style={{ background: PRIORITY_COLOR[task.priority] || "#6b7280" }}>
            <Highlight text={task.priority} query={highlight} />
          </span>
        </div>
      </div>

      {/* Right */}
      <div className="task-item__right">
        <span className="task-item__due">Due: {formatDate(task.dueDate)}</span>
        <button className="task-item__delete" onClick={() => onDelete(task.id)}>
          Delete
        </button>
      </div>
    </li>
  );
}
