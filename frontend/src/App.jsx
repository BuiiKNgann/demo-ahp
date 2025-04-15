// src/App.jsx
import { useState, useEffect } from "react";
import ExpertSelection from "./components/ExpertSelection";
import CriteriaMatrix from "./components/CriteriaMatrix";
import AlternativeMatrix from "./components/AlternativeMatrix";
import Results from "./components/Results";
import { getCriteria } from "./services/api";

function App() {
  const [selectedExpertId, setSelectedExpertId] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [criteriaWeights, setCriteriaWeights] = useState({});
  const [alternativeScores, setAlternativeScores] = useState({});
  const [criteriaEvaluated, setCriteriaEvaluated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCriteria = async () => {
      try {
        if (selectedExpertId) {
          setLoading(true);
          const criteriaData = await getCriteria();
          setCriteria(criteriaData);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching criteria:", err);
        setLoading(false);
      }
    };

    fetchCriteria();
  }, [selectedExpertId]);

  const handleExpertSelect = (expertId) => {
    setSelectedExpertId(expertId);
    // Reset when expert changes
    setCriteriaWeights({});
    setAlternativeScores({});
    setCriteriaEvaluated(false);
  };

  const handleCriteriaWeightsCalculated = (result) => {
    setCriteriaWeights(result.weights);
    setCriteriaEvaluated(true);
  };

  const handleAlternativeScoresCalculated = (criteriaId, result) => {
    setAlternativeScores((prev) => ({
      ...prev,
      [criteriaId]: result.scores,
    }));
  };

  // Kiểm tra nếu tất cả các tiêu chí đã được đánh giá
  const allCriteriaEvaluated =
    criteriaEvaluated &&
    criteria.length > 0 &&
    Object.keys(alternativeScores).length === criteria.length;

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 w-full">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800">
            Hệ thống hỗ trợ ra quyết định AHP
          </h1>
        </header>

        <main>
          <ExpertSelection onExpertSelect={handleExpertSelect} />

          {selectedExpertId && (
            <CriteriaMatrix
              expertId={selectedExpertId}
              onWeightsCalculated={handleCriteriaWeightsCalculated}
              disabled={criteriaEvaluated}
            />
          )}

          {selectedExpertId && criteriaEvaluated && !loading && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">
                Đánh giá phương án theo từng tiêu chí
              </h2>
              {criteria.map((criterion) => (
                <AlternativeMatrix
                  key={criterion.id}
                  expertId={selectedExpertId}
                  criteriaId={criterion.id}
                  criteriaName={criterion.name}
                  onScoresCalculated={handleAlternativeScoresCalculated}
                  disabled={alternativeScores[criterion.id] !== undefined}
                />
              ))}
            </div>
          )}

          {allCriteriaEvaluated && (
            <Results
              criteriaWeights={criteriaWeights}
              alternativeScores={alternativeScores}
            />
          )}
        </main>

        {/* <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>© 2025 Hệ thống ra quyết định AHP</p>
        </footer> */}
      </div>
    </div>
  );
}

export default App;
