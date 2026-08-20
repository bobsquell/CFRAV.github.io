import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [todos, setTodos] = useState([])
  const [input, setInput] = useState('')

  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, { id: Date.now(), text: input, done: false }])
      setInput('')
    }
  }

  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, done: !todo.done } : todo
    ))
  }

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  return (
    <div className="app">
      <header className="header">
        <h1>⚛️ React Test Site</h1>
        <p>Une démo simple avec compteur et TODO list</p>
      </header>

      <main className="main">
        <div className="card">
          <h2>Compteur</h2>
          <div className="counter">
            <button onClick={() => setCount(count - 1)}>−</button>
            <span>{count}</span>
            <button onClick={() => setCount(count + 1)}>+</button>
          </div>
          <button className="reset" onClick={() => setCount(0)}>Réinitialiser</button>
        </div>

        <div className="card">
          <h2>TODO List</h2>
          <div className="todo-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTodo()}
              placeholder="Ajoute une tâche..."
            />
            <button onClick={addTodo}>Ajouter</button>
          </div>

          <ul className="todo-list">
            {todos.length === 0 ? (
              <li className="empty">Aucune tâche pour le moment</li>
            ) : (
              todos.map(todo => (
                <li key={todo.id} className={todo.done ? 'done' : ''}>
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={() => toggleTodo(todo.id)}
                  />
                  <span>{todo.text}</span>
                  <button
                    className="delete"
                    onClick={() => deleteTodo(todo.id)}
                  >
                    ✕
                  </button>
                </li>
              ))
            )}
          </ul>
          <p className="count">{todos.filter(t => !t.done).length} tâche(s) à faire</p>
        </div>
      </main>
  )
}

export default App
