import { useFractal } from '../context/FractalContext';

export default function FractalControls() {
  const {
    inputText,
    setInputText,
    apiKey,
    setApiKey,
    handleGenerate,
    isLoading,
    progress,
    error,
  } = useFractal();

  return (
    <div className="controls glass-panel">
      <div className="input-group">
        <label htmlFor="text-input">Text</label>
        <textarea
          id="text-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter text to generate a fractal..."
          disabled={isLoading}
        />
      </div>

      <div className="input-group">
        <label htmlFor="api-key">OpenAI API Key</label>
        <input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          disabled={isLoading}
        />
        <small>Your API key is only used in your browser and never stored</small>
      </div>

      <button onClick={handleGenerate} disabled={isLoading} className="glass-button">
        {isLoading ? 'Generating...' : 'Generate Echo'}
      </button>

      {error && <div className="error">{error}</div>}

      {isLoading && (
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          <div className="progress-text">{progress.toFixed(1)}%</div>
        </div>
      )}
    </div>
  );
} 