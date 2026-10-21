/* eslint-disable max-len */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useState } from 'react';
import { UserWarning } from './UserWarning';
import { USER_ID } from './api/todos';
import { client } from './utils/fetchClient';
import { Todo } from './types/Todo';

export const App: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [editedTodoId, setEditedTodoId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const newTodoFieldRef = React.useRef<HTMLInputElement>(null);

  const handleTodosLoading = async () => {
    setErrorMessage(null);
    try {
      const data = await client.get<Todo[]>(`/todos?userId=${USER_ID}`);

      setTodos(data);
    } catch {
      setErrorMessage('load');
    }
  };

  const filteredTodos = () => {
    switch (filter) {
      case 'all':
        return [...todos];
      case 'active':
        return [...todos].filter(todo => !todo.completed);
      case 'completed':
        return [...todos].filter(todo => todo.completed);
    }
  };

  const hasCompleted = todos.some(todo => todo.completed);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!inputValue.trim()) {
      setErrorMessage('empty');

      return;
    }

    try {
      await client.post<Todo>(`/todos?userId=${USER_ID}`, {
        title: inputValue.trim(),
        completed: false,
        userId: USER_ID,
      });

      setInputValue('');
      await handleTodosLoading();
    } catch {
      setErrorMessage('add');
    }
  };

  const deleteTodo = async (todoId: number) => {
    setErrorMessage(null);
    try {
      await client.delete(`/todos/${todoId}`);
      await handleTodosLoading();

      newTodoFieldRef.current?.focus();
    } catch {
      setErrorMessage('delete');
    }
  };

  const clearCompleted = async () => {
    setErrorMessage(null);
    try {
      const completedTodos = todos.filter(todo => todo.completed);

      await Promise.all(
        completedTodos.map(todo => client.delete(`/todos/${todo.id}`)),
      );

      await handleTodosLoading();
    } catch {
      setErrorMessage('delete');
    }
  };

  const handleEditing = async (
    e: React.FormEvent<HTMLFormElement>,
    todo: Todo,
  ) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!editText.trim()) {
      setEditedTodoId(null);
      await deleteTodo(todo.id);

      return;
    }

    if (editText.trim() === todo.title) {
      setEditedTodoId(null);

      return;
    }

    try {
      await client.patch<Todo>(`/todos/${todo.id}`, {
        title: editText.trim(),
      });

      setEditedTodoId(null);
      await handleTodosLoading();
    } catch {
      setErrorMessage('update');
    }
  };

  useEffect(() => {
    void handleTodosLoading();
  }, []);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const timer = setTimeout(() => {
      setErrorMessage(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [errorMessage]);

  if (!USER_ID) {
    return <UserWarning />;
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    event.preventDefault();
  };

  const toggleTodo = async (todo: Todo) => {
    setErrorMessage(null);
    try {
      await client.patch<Todo>(`/todos/${todo.id}`, {
        completed: !todo.completed, // Змінюємо статус на протилежний
      });
      await handleTodosLoading(); // Перезавантажуємо список після успішного оновлення
    } catch {
      setErrorMessage('update');
    }
  };

  const handleSelectAll = async () => {
    setErrorMessage(null);
    try {
      const allCompleted = todos.every(todo => todo.completed);

      const targetStatus = !allCompleted;

      await Promise.all(
        todos
          .filter(todo => todo.completed !== targetStatus)
          .map(todo =>
            client.patch(`/todos/${todo.id}`, {
              completed: targetStatus,
            }),
          ),
      );

      await handleTodosLoading();
    } catch {
      setErrorMessage('update');
    }
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          <button
            type="button"
            className="todoapp__toggle-all active"
            data-cy="ToggleAllButton"
            onClick={() => handleSelectAll()}
          />

          <form onSubmit={handleSubmit}>
            <input
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={inputValue}
              onChange={handleChange}
              ref={newTodoFieldRef}
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {filteredTodos().map(todo => {
            const isEditing = todo.id === editedTodoId;

            return (
              <div
                data-cy="Todo"
                className={`todo ${todo.completed ? 'completed' : ''} ${isEditing ? 'editing' : ''}`}
                key={todo.id}
              >
                <label className="todo__status-label">
                  <input
                    data-cy="TodoStatus"
                    type="checkbox"
                    className="todo__status"
                    checked={todo.completed}
                    onChange={() => void toggleTodo(todo)}
                  />
                </label>

                {isEditing ? (
                  <form
                    onSubmit={e => {
                      void handleEditing(e, todo);
                    }}
                  >
                    <input
                      data-cy="TodoTitleField"
                      type="text"
                      className="todo__title-field"
                      placeholder="Empty todo will be deleted"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onBlur={async () => {
                        if (!editText.trim()) {
                          setEditedTodoId(null);
                          await deleteTodo(todo.id);
                        } else {
                          setEditedTodoId(null);
                        }
                      }}
                      autoFocus
                    />
                  </form>
                ) : (
                  <span
                    data-cy="TodoTitle"
                    className="todo__title"
                    onDoubleClick={() => {
                      setEditedTodoId(todo.id);
                      setEditText(todo.title);
                    }}
                  >
                    {todo.title}
                  </span>
                )}

                {!isEditing && (
                  <button
                    type="button"
                    className="todo__remove"
                    data-cy="TodoDelete"
                    onClick={() => void deleteTodo(todo.id)}
                  >
                    ×
                  </button>
                )}

                <div data-cy="TodoLoader" className="modal overlay">
                  <div className="modal-background has-background-white-ter" />
                  <div className="loader" />
                </div>
              </div>
            );
          })}
        </section>
        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {todos.filter(todo => !todo.completed).length} items left
            </span>

            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={`filter__link ${filter === 'all' ? 'selected' : ''}`}
                data-cy="FilterLinkAll"
                onClick={() => setFilter('all')}
              >
                All
              </a>

              <a
                href="#/active"
                className={`filter__link ${filter === 'active' ? 'selected' : ''}`}
                data-cy="FilterLinkActive"
                onClick={() => setFilter('active')}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={`filter__link ${filter === 'completed' ? 'selected' : ''}`}
                data-cy="FilterLinkCompleted"
                onClick={() => setFilter('completed')}
              >
                Completed
              </a>
            </nav>
            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              style={{ visibility: hasCompleted ? 'visible' : 'hidden' }}
              disabled={!hasCompleted}
              onClick={() => void clearCompleted()}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      <div
        data-cy="ErrorNotification"
        className={`notification is-danger is-light has-text-weight-normal ${
          errorMessage ? '' : 'hidden'
        }`}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setErrorMessage(null)}
        />
        {errorMessage === 'load' && 'Unable to load todos'}
        {errorMessage === 'empty' && 'Title should not be empty'}
        {errorMessage === 'add' && 'Unable to add a todo'}
        {errorMessage === 'delete' && 'Unable to delete a todo'}
        {errorMessage === 'update' && 'Unable to update a todo'}
      </div>
    </div>
  );
};
