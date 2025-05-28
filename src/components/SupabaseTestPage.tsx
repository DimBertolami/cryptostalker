// src/components/SupabaseTestPage.tsx
import { useState, useEffect } from 'react';
import supabase from '../utils/supabase'; // Corrected path assuming supabase.ts is in src/utils

interface Todo {
  id: number; // Assuming an id for key and it's a number
  task: string; // Assuming a task field which is a string
  // Add other fields if your 'todos' table has them
}

function SupabaseTestPage() {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    async function getTodos() {
      // Select specific columns if needed, e.g., .select('id, task')
      const { data, error } = await supabase.from('todos').select('*');

      if (error) {
        console.error('Error fetching todos:', error);
        return;
      }

      if (data) {
        setTodos(data as Todo[]);
      }
    }

    getTodos();
  }, []);

  return (
    <div>
      <h2>My Todos from Supabase</h2>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.task}</li>
        ))}
      </ul>
      {todos.length === 0 && <p>No todos found, or table is empty.</p>}
    </div>
  );
}

export default SupabaseTestPage;