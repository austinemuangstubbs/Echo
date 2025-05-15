import './App.css'
import EmbeddingFractal from './components/EmbeddingFractal'

function App() {
  return (
    <div className="app">
      <header>
        <h1>Echo</h1>
        <p>Visualize Meaning</p>
      </header>
      
      <main>
        <EmbeddingFractal />
      </main>
      
      <footer>
        <p>
          <a href="https://openai.com/blog/embedding-models" target="_blank" rel="noopener noreferrer">About How Embeddings Work</a>
        </p>
      </footer>
    </div>
  )
}

export default App
