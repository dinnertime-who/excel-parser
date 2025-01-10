import { useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './App.css';

function App() {
  const [savedPaths, setSavedPaths] = useState<string[]>([]);
  const excelInput = useRef<HTMLInputElement>(null);

  async function processExcel() {
    if (!excelInput.current || !excelInput.current.files) return;

    for (const file of excelInput.current.files) {
      const reader = new FileReader();
      reader.onload = async function () {
        const arrayBuffer = reader.result;
        if (!arrayBuffer || typeof arrayBuffer === 'string') return;

        const fileBytes = Array.from(new Uint8Array(arrayBuffer));
        const result = await invoke('process_excel_from_upload', {
          fileBytes: fileBytes,
          fileName: file.name,
        });
        setSavedPaths((prev) => [...prev, result as string]);
      };
      reader.readAsArrayBuffer(file);
    }
  }

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          processExcel();
        }}
      >
        <input type="file" ref={excelInput} />
        <button type="submit">엑셀 처리하기</button>
      </form>

      <div>
        {savedPaths.map((path) => (
          <div>{`저장완료: ${path}`}</div>
        ))}
      </div>
    </main>
  );
}

export default App;
