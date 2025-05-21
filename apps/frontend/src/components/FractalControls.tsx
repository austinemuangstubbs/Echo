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
    downloadFractal,
    isDownloading,
    downloadProgress,
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
          style={{ resize: 'none' }}
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

      <button onClick={handleGenerate} disabled={isLoading || isDownloading} className="glass-button">
        {isLoading ? 'Generating...' : 'Generate Echo'}
      </button>

      {/* Download current fractal */}
      <button
        onClick={() => downloadFractal()}
        disabled={isLoading || isDownloading}
        className="glass-button"
        style={{ marginTop: '0.5rem' }}
      >
        {isDownloading ? 'Downloading…' : 'Download Image'}
      </button>

      {error && <div className="error">{error}</div>}

      {(isLoading || isDownloading) && (
        <div className="progress">
          <div className="progress-bar" style={{ width: `${isLoading ? progress : downloadProgress}%` }}></div>
          <div className="progress-text">{(isLoading ? progress : downloadProgress).toFixed(1)}%</div>
        </div>
      )}
    </div>
  );
} 