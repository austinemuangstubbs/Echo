import { useMemo } from 'react';
import { useFractal } from '../context/FractalContext';
import { levenshteinDistance, cosineSimilarity } from '../utils/similarity';

export default function ComparisonMetrics() {
  const { selectedForComparison } = useFractal();

  // Require two items selected
  if (selectedForComparison.length !== 2) return null;

  const [a, b] = selectedForComparison;

  const distancePercent = useMemo(() => {
    const textA = a.text ?? '';
    const textB = b.text ?? '';
    const distance = levenshteinDistance(textA, textB);

    // Normalize by average length of the two strings to keep 100 % as the worst-case distance
    const avgChars = (textA.length + textB.length) / 2;
    return avgChars > 0 ? (distance / avgChars) * 100 : 0;
  }, [a.text, b.text]);

  const cosSim = useMemo(() => {
    if (a.embeddings && a.embeddings.length && b.embeddings && b.embeddings.length) {
      return cosineSimilarity(a.embeddings, b.embeddings);
    }
    return null;
  }, [a.embeddings, b.embeddings]);

  return (
    <div className="comparison-metrics glass-panel" style={{ marginTop: '1rem', padding: '1rem' }}>
      <h3>Similarity Metrics</h3>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <Metric label="Levenshtein Distance" value={`${distancePercent.toFixed(2)}%`} />
        <Metric label="Cosine Similarity" value={cosSim !== null ? `${(cosSim * 100).toFixed(2)}%` : 'N/A'} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: '200px' }}>
      <div style={{ fontSize: '0.85rem', color: '#999' }}>{label}</div>
      <div style={{ fontSize: '1.3rem', fontWeight: 600 }}>{value}</div>
    </div>
  );
} 