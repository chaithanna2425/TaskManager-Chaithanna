import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000/api/tasks/";
const AUTH_URL = "http://127.0.0.1:8000/api/auth/";

const getDueDateText = (dueDate, status) => {
  if (!dueDate) return "";

  if (status === "Completed") {
    return `Due: ${dueDate}`;
  }

  const today = new Date();
  const due = new Date(dueDate);

  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const difference = Math.ceil(
    (due - today) / (1000 * 60 * 60 * 24)
  );

  if (difference < 0) return "Overdue";
  if (difference === 0) return "Due today";
  if (difference === 1) return "Due tomorrow";

  return `Due in ${difference} days`;
};

function App() {
  const [loggedIn, setLoggedIn] = useState(
    localStorage.getItem("loggedIn") === "true"
  );

  const [authMode, setAuthMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Pending");
  const [dueDate, setDueDate] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const handleAuth = async (event) => {
    event.preventDefault();
    setAuthError("");

    const endpoint =
      authMode === "login" ? "login/" : "register/";

    const body =
      authMode === "login"
        ? { username, password }
        : { username, email, password };

    try {
      const response = await fetch(`${AUTH_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Something went wrong."
        );
      }

      if (authMode === "register") {
        setAuthMode("login");
        setAuthError(
          "Account created successfully. Please log in."
        );
        setPassword("");
      } else {
        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("username", data.username);
        localStorage.setItem("token", data.token);
        setLoggedIn(true);
      }
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const logout = () => {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("username");
    localStorage.removeItem("token");

    setLoggedIn(false);
    setUsername("");
    setPassword("");
    setTasks([]);
  };

  const getTasks = () => {
    setLoading(true);
    setError("");

    fetch(API_URL, {
      headers: {
        Authorization: `Token ${localStorage.getItem("token")}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load tasks");
        }

        return response.json();
      })
      .then((data) => {
        setTasks(
          Array.isArray(data)
            ? data
            : Array.isArray(data.results)
              ? data.results
              : []
        );
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setError("Could not connect to the server.");
        setTasks([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (loggedIn) {
      getTasks();
    } else {
      setLoading(false);
    }
  }, [loggedIn]);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      (task.title || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (task.description || "")
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesStatus =
      filterStatus === "All" ||
      task.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const clearForm = () => {
    setTitle("");
    setDescription("");
    setStatus("Pending");
    setDueDate("");
    setEditingId(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!title.trim()) {
      alert("Please enter a task title.");
      return;
    }

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      status,
      due_date: dueDate || null,
    };

    const url = editingId
      ? `${API_URL}${editingId}/`
      : API_URL;

    const method = editingId ? "PUT" : "POST";

    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(taskData),
    })
      .then(async (response) => {
        if (!response.ok) {
          let message = "Request failed.";

          try {
            const data = await response.json();
            message =
              data.detail ||
              data.error ||
              Object.values(data).flat().join(" ") ||
              message;
          } catch {
            // Keep the default message.
          }

          throw new Error(message);
        }

        return response.json();
      })
      .then(() => {
        clearForm();
        getTasks();
      })
      .catch((error) => {
        console.error(error);
        alert(error.message || "Something went wrong.");
      });
  };

  const editTask = (task) => {
    setEditingId(task.id);
    setTitle(task.title || "");
    setDescription(task.description || "");
    setStatus(task.status || "Pending");
    setDueDate(task.due_date || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteTask = (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this task?"
      )
    ) {
      return;
    }

    fetch(`${API_URL}${id}/`, {
      method: "DELETE",
      headers: {
        Authorization: `Token ${localStorage.getItem("token")}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Delete failed");
        }

        getTasks();
      })
      .catch((error) => {
        console.error(error);
        alert("Could not delete task.");
      });
  };

  if (!loggedIn) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">✓</div>

          <h1>Task Manager</h1>

          <p className="auth-subtitle">
            {authMode === "login"
              ? "Welcome back. Let's get things done."
              : "Create your account and stay organized."}
          </p>

          <form onSubmit={handleAuth}>
            <label>Username</label>

            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              required
            />

            {authMode === "register" && (
              <>
                <label>Email</label>

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  required
                />
              </>
            )}

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />

            {authError && (
              <p className="auth-message">{authError}</p>
            )}

            <button type="submit" className="auth-button">
              {authMode === "login"
                ? "Login"
                : "Create Account"}
            </button>
          </form>

          <div className="auth-switch">
            {authMode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError("");
                  }}
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError("");
                  }}
                >
                  Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const completedTasks = tasks.filter(
    (task) => task.status === "Completed"
  ).length;

  const inProgressTasks = tasks.filter(
    (task) => task.status === "In Progress"
  ).length;

  const pendingTasks = tasks.filter(
    (task) => task.status === "Pending"
  ).length;

  const progress =
    tasks.length > 0
      ? Math.round((completedTasks / tasks.length) * 100)
      : 0;

  return (
    <div className="app">
      <header className="top-bar">
        <div className="brand-area">
          <div className="brand-icon">✓</div>

          <div>
            <h1>Task Manager</h1>
            <p>
              Welcome back,{" "}
              {localStorage.getItem("username") || "User"}
            </p>
          </div>
        </div>

        <button className="logout-button" onClick={logout}>
          Logout
        </button>
      </header>

      <section className="hero-section">
        <div>
          <span className="eyebrow">PERSONAL WORKSPACE</span>

          <h2>
            Stay focused.
            <br />
            Get things done.
          </h2>

          <p>
            Organize your work, track your progress,
            and keep moving forward.
          </p>
        </div>

        <div className="hero-stat">
          <strong>{progress}%</strong>
          <span>completed</span>
        </div>
      </section>

      <section className="task-form-card">
        <div className="section-heading">
          <span className="section-label">
            {editingId ? "UPDATE" : "CREATE"}
          </span>

          <h2>
            {editingId ? "Edit task" : "Add a new task"}
          </h2>
        </div>

        <form className="task-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-field wide">
              <label>Task title</label>

              <input
                type="text"
                placeholder="What needs to be done?"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
              />
            </div>

            <div className="form-field">
              <label>Status</label>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">
                  In Progress
                </option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="form-field">
              <label>Due date</label>

              <input
                type="date"
                value={dueDate}
                onChange={(event) =>
                  setDueDate(event.target.value)
                }
              />
            </div>
          </div>

          <div className="form-field">
            <label>Description</label>

            <textarea
              placeholder="Add some details..."
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
            />
          </div>

          <div className="form-buttons">
            <button type="submit" className="primary-button">
              {editingId ? "Update task" : "Add task"}
            </button>

            {editingId && (
              <button
                type="button"
                className="secondary-button"
                onClick={clearForm}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="progress-card">
        <div className="progress-top">
          <div>
            <span className="section-label">OVERVIEW</span>
            <h2>Your progress</h2>
            <p>Keep going — you're making progress.</p>
          </div>

          <div className="progress-percentage">
            {progress}%
          </div>
        </div>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">#</div>
            <div>
              <strong>{tasks.length}</strong>
              <span>Total tasks</span>
            </div>
          </div>

          <div className="stat-card completed">
            <div className="stat-icon">✓</div>
            <div>
              <strong>{completedTasks}</strong>
              <span>Completed</span>
            </div>
          </div>

          <div className="stat-card progress">
            <div className="stat-icon">◐</div>
            <div>
              <strong>{inProgressTasks}</strong>
              <span>In progress</span>
            </div>
          </div>

          <div className="stat-card pending">
            <div className="stat-icon">○</div>
            <div>
              <strong>{pendingTasks}</strong>
              <span>Pending</span>
            </div>
          </div>
        </div>
      </section>

      <section className="tasks-section">
        <div className="tasks-header">
          <div>
            <span className="section-label">WORKSPACE</span>

            <h2>
              My tasks <span>{filteredTasks.length}</span>
            </h2>
          </div>

          <div className="filters">
            <div className="search-box">
              <span>⌕</span>

              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>

            <select
              value={filterStatus}
              onChange={(event) =>
                setFilterStatus(event.target.value)
              }
            >
              <option value="All">All tasks</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">
                In Progress
              </option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="task-list">
          {loading && (
            <div className="message-card">
              Loading tasks...
            </div>
          )}

          {!loading && error && (
            <div className="message-card error-card">
              {error}
            </div>
          )}

          {!loading &&
            !error &&
            tasks.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">✓</div>
                <h3>No tasks yet</h3>
                <p>
                  Add your first task above to get started.
                </p>
              </div>
            )}

          {!loading &&
            !error &&
            tasks.length > 0 &&
            filteredTasks.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">⌕</div>
                <h3>No matching tasks</h3>
                <p>
                  Try another search or status filter.
                </p>
              </div>
            )}

          {!loading &&
            !error &&
            filteredTasks.map((task) => {
              const dueText = getDueDateText(
                task.due_date,
                task.status
              );

              return (
                <article className="task-card" key={task.id}>
                  <div className="task-card-top">
                    <div className="task-main">
                      <h3>{task.title}</h3>

                      {task.description && (
                        <p>{task.description}</p>
                      )}
                    </div>

                    <span
                      className={`status-badge ${(
                        task.status || "Pending"
                      )
                        .toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <div className="task-card-bottom">
                    <div
                      className={`due-date ${
                        dueText === "Overdue" ? "overdue" : ""
                      }`}
                    >
                      {dueText && (
                        <>
                          <span>📅</span>
                          {dueText}
                        </>
                      )}
                    </div>

                    <div className="task-buttons">
                      <button
                        className="edit-button"
                        onClick={() => editTask(task)}
                      >
                        Edit
                      </button>

                      <button
                        className="delete-button"
                        onClick={() => deleteTask(task.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
        </div>
      </section>

      <footer className="footer">
        <span>Task Manager</span>
        <span>Stay organized. Keep moving.</span>
      </footer>
    </div>
  );
}

export default App;
