import { useState } from "react";
import { todayStr } from "../../utils/helpers";
import "./AddTaskModal.css";

const nowDatetimeLocal = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(
    n.getDate()
  ).padStart(2, "0")}T${String(n.getHours()).padStart(2, "0")}:${String(
    n.getMinutes()
  ).padStart(2, "0")}`;
};

const defaultDateDisplay = () => {
  const n = new Date();
  return `Today, ${n.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
};

export default function AddTaskModal({ visible, onClose, onAdd, user }) {
  const photoURL = user?.photoURL || null;
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'You';
  const initials = displayName.slice(0, 2).toUpperCase();
  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");
  const [priority, setPriority] = useState("High");
  const [category, setCategory] = useState("Personal");
  const [dueDate, setDueDate]   = useState(nowDatetimeLocal());
  const [dateDisplay, setDateDisplay] = useState(defaultDateDisplay);

  const handleDateChange = (val) => {
    setDueDate(val);
    if (!val) return;
    const sel = new Date(val);
    const isToday = sel.toDateString() === new Date().toDateString();
    const time = sel.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setDateDisplay(
      isToday
        ? `Today, ${time}`
        : `${sel.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`
    );
  };

  const resetForm = () => {
    setTitle("");
    setDesc("");
    setPriority("High");
    setCategory("Personal");
    const fresh = nowDatetimeLocal();
    setDueDate(fresh);
    setDateDisplay(defaultDateDisplay());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Please enter a task title");
      return;
    }
    onAdd({
      title: title.trim(),
      description: desc.trim(),
      dueDate: dueDate ? dueDate.split("T")[0] : todayStr(),
      priority,
      category,
    });
    resetForm();
    onClose();
  };

  return (
    <div className={`add-task-modal${visible ? "" : " add-task-modal--hidden"}`}>
      <div className="add-task-modal__card">

        {/* Header */}
        <div className="add-task-modal__header">
          <button className="add-task-modal__back" onClick={onClose} title="Back">
            ←
          </button>
          <h2>Add New Task</h2>
          <div className="add-task-modal__avatar">
            {photoURL
              ? <img src={photoURL} alt={displayName} referrerPolicy="no-referrer" />
              : <span className="add-task-modal__avatar-initials">{initials}</span>
            }
          </div>
        </div>

        {/* Text inputs */}
        <div className="add-task-modal__inputs">
          <input
            className="add-task-modal__text-input"
            type="text"
            placeholder="Task Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            className="add-task-modal__text-input add-task-modal__text-input--desc"
            type="text"
            placeholder="Description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        {/* Options */}
        <div className="add-task-modal__options">

          {/* Due date */}
          <div className="add-task-modal__option-row">
            <span className="add-task-modal__option-label">Due Date:</span>
            <div className="add-task-modal__date-right">
              <span className="add-task-modal__date-display">{dateDisplay}</span>
              <input
                className="add-task-modal__datetime-input"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => handleDateChange(e.target.value)}
              />
            </div>
          </div>

          {/* Priority */}
          <div className="add-task-modal__option-row">
            <span className="add-task-modal__option-label">Priority:</span>
            <select
              className="add-task-modal__select add-task-modal__select--priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>

          {/* Category */}
          <div className="add-task-modal__option-row">
            <span className="add-task-modal__option-label">Category:</span>
            <select
              className="add-task-modal__select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Personal</option>
              <option>Work</option>
              <option>School</option>
              <option>Health</option>
            </select>
          </div>

          <button className="add-task-modal__submit" onClick={handleSubmit}>
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
}
